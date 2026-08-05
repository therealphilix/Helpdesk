import asyncio
import hashlib
import json
import logging
from email.utils import parseaddr

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import verify_webhook_secret
from ..models.enums import SenderType, TicketStatus
from ..models.ticket import Ticket
from ..models.ticket_reply import TicketReply
from ..models.user import User
from ..schemas.ticket import InboundEmail, ResendWebhookPayload, TicketOut

logger = logging.getLogger(__name__)
router = APIRouter()


def _body_hash(body_text: str) -> str:
    return hashlib.sha256(body_text.encode()).hexdigest()


def _parse_sender(from_field: str) -> tuple[str, str | None]:
    name, addr = parseaddr(from_field)
    if not addr:
        raise ValueError(f"Could not parse sender email from: {from_field!r}")
    return addr, name or None


async def _fetch_email_content(email_id: str) -> dict[str, str | None]:
    if not settings.RESEND_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not configured",
        )

    def _sync_fetch() -> dict[str, str | None]:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        email = resend.Emails.Receiving.get(email_id=email_id)

        if isinstance(email, dict):
            text = email.get("text")
            html = email.get("html")
            from_field = email.get("from")
            headers = email.get("headers", {})
        else:
            text = getattr(email, "text", None)
            html = getattr(email, "html", None)
            from_field = getattr(email, "from", None)
            headers = getattr(email, "headers", None) or {}

        if isinstance(headers, dict):
            display_from = headers.get("from") or headers.get("From") or from_field
        else:
            display_from = getattr(headers, "from", None) or getattr(headers, "From", None) or from_field

        return {
            "text": text,
            "html": html,
            "from": display_from,
        }

    try:
        return await asyncio.to_thread(_sync_fetch)
    except Exception as exc:
        logger.exception("Failed to fetch email %s from Resend", email_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch email content: {exc}",
        )


@router.post("/email")
async def inbound_email(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _validated: None = Depends(verify_webhook_secret),
):
    raw_body = getattr(request.state, "_raw_body", None)
    if raw_body is None:
        raw_body = await request.body()
    try:
        payload_dict = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    try:
        webhook = ResendWebhookPayload.model_validate(payload_dict)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        )

    if webhook.type != "email.received":
        return {"status": "ignored", "type": webhook.type}

    data = webhook.data

    if data.body_text is not None:
        sender_email, sender_name = _parse_sender(
            data.from_ or "unknown@unknown.com"
        )
        inbound = InboundEmail(
            sender_email=sender_email,
            sender_name=sender_name,
            subject=data.subject or "",
            body_text=data.body_text,
            body_html=data.body_html,
        )
        return await _process_inbound_email(inbound, db, response, request)

    content = await _fetch_email_content(data.email_id)
    from_field = content.get("from") or data.from_ or "unknown@unknown.com"
    sender_email, sender_name = _parse_sender(from_field)

    text = content.get("text") or ""
    html = content.get("html")
    subject = data.subject or ""

    if not text and not html:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email has no text or HTML content",
        )

    inbound = InboundEmail(
        sender_email=sender_email,
        sender_name=sender_name,
        subject=subject,
        body_text=text or "(no plain text content)",
        body_html=html,
    )
    return await _process_inbound_email(inbound, db, response, request)


async def _process_inbound_email(
    body: InboundEmail,
    db: AsyncSession,
    response: Response,
    request: Request,
) -> TicketOut:
    body_hash = _body_hash(body.body_text)

    existing = await db.execute(
        select(Ticket).where(
            Ticket.sender_email == body.sender_email,
            Ticket.subject == body.subject,
            Ticket.status.in_([TicketStatus.NEW, TicketStatus.PROCESSING, TicketStatus.OPEN])
        )
    )
    for ticket in existing.scalars().all():
        if _body_hash(ticket.body_text) == body_hash:
            response.status_code = status.HTTP_200_OK
            return TicketOut.model_validate(ticket)

        reply = TicketReply(
            ticket_id=ticket.id,
            sender_type=SenderType.CUSTOMER,
            body_text=body.body_text,
            body_html=body.body_html,
        )
        db.add(reply)

        if body.sender_name and body.sender_name != ticket.sender_name:
            ticket.sender_name = body.sender_name

        await db.commit()
        await db.refresh(ticket)
        response.status_code = status.HTTP_200_OK
        return TicketOut.model_validate(ticket)

    ticket = Ticket(
        sender_email=body.sender_email,
        sender_name=body.sender_name,
        subject=body.subject,
        body_text=body.body_text,
        body_html=body.body_html,
    )

    ai_result = await db.execute(select(User).where(User.email == "ai@helpdesk.com"))
    ai_agent = ai_result.scalar_one_or_none()
    if ai_agent:
        ticket.assigned_to = ai_agent.id

    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    try:
        arq_redis = getattr(request.app.state, "arq_redis", None)
        if arq_redis:
            await arq_redis.enqueue_job("classify_ticket", ticket.id)
            await arq_redis.enqueue_job("auto_resolve_ticket", ticket.id)
    except Exception:
        logger.exception("Failed to enqueue jobs for ticket %s", ticket.id)

    response.status_code = status.HTTP_201_CREATED
    return TicketOut.model_validate(ticket)
