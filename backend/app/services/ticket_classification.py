import json
import logging
import uuid

from openai import AsyncOpenAI

from ..core.config import settings
from ..core.database import async_session
from ..models.enums import TicketCategory
from ..models.ticket import Ticket

logger = logging.getLogger(__name__)

CATEGORY_VALUES = [c.value for c in TicketCategory]


async def classify_ticket(ctx: dict, ticket_id: uuid.UUID) -> None:
    if not settings.OPENAI_API_KEY:
        return

    async with async_session() as db:
        ticket = await db.get(Ticket, ticket_id)
        if not ticket or ticket.category is not None:
            return

        try:
            client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
            )

            category_lines = "\n".join(
                f"- {c.value}: {c.description}"
                for c in TicketCategory
            )
            category_values_str = ", ".join(f'"{v}"' for v in CATEGORY_VALUES)

            system_prompt = (
                "You are a ticket classification assistant for a support ticket management system. "
                "Classify the ticket into exactly one of these categories:\n"
                f"{category_lines}\n"
                "Respond with a JSON object with a single key 'category' whose value is "
                f"one of: {category_values_str}. "
                "Return only the JSON object, no other text."
            )

            user_message = (
                f"Subject: {ticket.subject}\n\nBody:\n{ticket.body_text}"
            )

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.1,
                max_tokens=128,
            )

            raw = response.choices[0].message.content or ""
            raw = raw.strip().removeprefix("```json").removesuffix("```").strip()

            result = json.loads(raw)
            category_value = result.get("category", "").strip()

            if category_value in CATEGORY_VALUES:
                ticket.category = TicketCategory(category_value)
                await db.commit()
                logger.info("Ticket %s classified as %s", ticket_id, category_value)
            else:
                logger.warning(
                    "Ticket %s: unrecognized category '%s' from LLM", ticket_id, category_value
                )

        except Exception:
            logger.exception("Failed to classify ticket %s", ticket_id)
