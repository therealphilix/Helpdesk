import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

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


class TicketListOut(BaseModel):
    id: uuid.UUID
    sender_email: str
    sender_name: str | None
    subject: str
    status: TicketStatus
    category: TicketCategory | None
    assigned_to: uuid.UUID | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_assignee_name(cls, data: object) -> object:
        if hasattr(data, "assignee"):
            name = data.assignee.name if data.assignee is not None else None
            if isinstance(data, dict):
                data["assignee_name"] = name
            else:
                return {
                    "id": data.id,
                    "sender_email": data.sender_email,
                    "sender_name": data.sender_name,
                    "subject": data.subject,
                    "status": data.status,
                    "category": data.category,
                    "assigned_to": data.assigned_to,
                    "created_at": data.created_at,
                    "updated_at": data.updated_at,
                    "assignee_name": name,
                }
        return data


class TicketPaginatedOut(BaseModel):
    items: list[TicketListOut]
    total: int
