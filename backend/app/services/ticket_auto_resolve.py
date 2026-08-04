import json
import logging
import uuid
from pathlib import Path

from openai import AsyncOpenAI

from ..core.config import settings
from ..core.database import async_session
from ..models.enums import SenderType, TicketStatus
from ..models.ticket import Ticket
from ..models.ticket_reply import TicketReply

logger = logging.getLogger(__name__)


def _load_knowledge_base() -> str:
    kb_path = Path(settings.KNOWLEDGE_BASE_PATH)
    if not kb_path.is_file():
        logger.warning("Knowledge base file not found at %s", kb_path)
        return ""
    return kb_path.read_text(encoding="utf-8")


async def auto_resolve_ticket(ctx: dict, ticket_id: uuid.UUID) -> None:
    if not settings.OPENAI_API_KEY:
        return

    kb_content = _load_knowledge_base()
    if not kb_content:
        return

    async with async_session() as db:
        ticket = await db.get(Ticket, ticket_id)
        if not ticket or ticket.status != TicketStatus.NEW:
            return

        ticket.status = TicketStatus.PROCESSING
        await db.commit()

        try:
            client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
            )

            system_prompt = (
                "You are a support assistant for an online course platform. "
                "Below is a knowledge base of official support policies and troubleshooting guides. "
                "Check whether the customer's question can be fully answered using the knowledge base content.\n\n"
                "If the knowledge base can answer the question, respond with a JSON object:\n"
                '{"action": "resolve", "reply": "<your helpful reply based on the KB>"}\n\n'
                "If the knowledge base does NOT cover the question or cannot fully answer it, respond with:\n"
                '{"action": "skip"}\n\n'
                "Rules for the reply:\n"
                "- Only resolve if the KB provides a complete, accurate answer.\n"
                "- Write the reply body only — do NOT include a salutation (e.g. 'Hi Alice') or a closing signature (e.g. 'Best regards').\n"
                "- Use a professional, warm, and customer-friendly tone.\n"
                "- Format the reply with proper paragraphs and line breaks for readability.\n"
                "- When providing steps, use a numbered list.\n"
                "- Do not fabricate information not present in the KB.\n"
                "- Return only the JSON object, no other text."
            )

            user_message = (
                "=== KNOWLEDGE BASE ===\n"
                f"{kb_content}\n\n"
                "=== CUSTOMER TICKET ===\n"
                f"Subject: {ticket.subject}\n\n"
                f"Body:\n{ticket.body_text}"
            )

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.3,
                max_tokens=2048,
            )

            raw = response.choices[0].message.content or ""
            raw = raw.strip().removeprefix("```json").removesuffix("```").strip()

            result = json.loads(raw)
            action = result.get("action", "skip")

            if action == "resolve" and result.get("reply"):
                logger.info("Ticket %s auto-resolved via knowledge base", ticket_id)

                first_name = ticket.sender_name.split(" ")[0] if ticket.sender_name else "there"
                salutation = f"Hi {first_name},\n\n"
                signature = "\n\nBest regards,\nSupport Team"
                formatted_reply = salutation + result["reply"].strip() + signature

                async with db.begin():
                    reply = TicketReply(
                        ticket_id=ticket.id,
                        sender_type=SenderType.AGENT,
                        body_text=formatted_reply,
                    )
                    db.add(reply)
                    ticket.status = TicketStatus.RESOLVED
            else:
                logger.info("Ticket %s could not be auto-resolved, setting to open", ticket_id)
                async with db.begin():
                    ticket.status = TicketStatus.OPEN

        except Exception:
            logger.exception("Auto-resolve failed for ticket %s, setting to open", ticket_id)
            async with db.begin():
                ticket.status = TicketStatus.OPEN
