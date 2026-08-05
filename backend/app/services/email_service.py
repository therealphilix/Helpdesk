import asyncio
import logging
import uuid

import resend

from ..core.config import settings
from ..core.database import async_session
from ..models.ticket import Ticket

logger = logging.getLogger(__name__)


async def send_reply_email(
    ctx: dict,
    ticket_id: uuid.UUID,
    body_text: str,
    body_html: str | None = None,
) -> None:
    if not settings.RESEND_API_KEY or not settings.FROM_EMAIL:
        logger.warning("Skipping email send: RESEND_API_KEY or FROM_EMAIL not configured")
        return

    async with async_session() as db:
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            logger.warning("Ticket %s not found for email send", ticket_id)
            return

    def _sync_send() -> None:
        resend.api_key = settings.RESEND_API_KEY

        params: dict = {
            "from": settings.FROM_EMAIL,
            "to": [ticket.sender_email],
            "subject": f"Re: {ticket.subject}",
            "text": body_text,
        }
        if body_html:
            params["html"] = body_html

        resend.Emails.send(params)

    try:
        await asyncio.to_thread(_sync_send)
        logger.info("Reply email sent for ticket %s to %s", ticket_id, ticket.sender_email)
    except Exception:
        logger.exception("Failed to send reply email for ticket %s", ticket_id)
