import hashlib

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.dependencies import verify_webhook_secret
from ..models.ticket import Ticket
from ..schemas.ticket import InboundEmail, TicketOut

router = APIRouter()


def _body_hash(body_text: str) -> str:
    return hashlib.sha256(body_text.encode()).hexdigest()


@router.post("/email", response_model=TicketOut)
async def inbound_email(
    request: Request,
    body: InboundEmail,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _validated: None = Depends(verify_webhook_secret),
):
    body_hash = _body_hash(body.body_text)

    existing = await db.execute(
        select(Ticket).where(
            Ticket.sender_email == body.sender_email,
            Ticket.subject == body.subject,
        )
    )
    for ticket in existing.scalars().all():
        if _body_hash(ticket.body_text) == body_hash:
            response.status_code = status.HTTP_200_OK
            return ticket

    ticket = Ticket(
        sender_email=body.sender_email,
        sender_name=body.sender_name,
        subject=body.subject,
        body_text=body.body_text,
        body_html=body.body_html,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    response.status_code = status.HTTP_201_CREATED
    return ticket
