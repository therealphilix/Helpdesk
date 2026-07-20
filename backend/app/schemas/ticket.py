import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from ..models.enums import TicketCategory, TicketStatus

_SUBJECT_PREFIX_RE = re.compile(
    r"^(?:(?:RE|FWD?|AW|WG|SV|VS)\s*:\s*)+",
    re.IGNORECASE,
)


class InboundEmail(BaseModel):
    sender_email: EmailStr
    sender_name: str | None = Field(default=None, max_length=255)
    subject: str = Field(min_length=1)
    body_text: str = Field(min_length=1)
    body_html: str | None = Field(default=None)

    @field_validator("subject", mode="before")
    @classmethod
    def strip_email_prefixes(cls, v: str) -> str:
        if isinstance(v, str):
            return _SUBJECT_PREFIX_RE.sub("", v).strip()
        return v


class TicketOut(BaseModel):
    id: uuid.UUID
    sender_email: str
    sender_name: str | None
    subject: str
    body_text: str
    body_html: str | None
    status: TicketStatus
    category: TicketCategory | None
    assigned_to: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
