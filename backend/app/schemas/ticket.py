import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from ..models.enums import SenderType, TicketCategory, TicketStatus
from .reply import ReplyOut

_SUBJECT_PREFIX_RE = re.compile(
    r"^(?:(?:RE|FWD?|AW|WG|SV|VS)\s*:\s*)+",
    re.IGNORECASE,
)


class ResendAttachment(BaseModel):
    id: str
    filename: str
    content_type: str
    content_disposition: str | None = None
    content_id: str | None = None


class ResendWebhookData(BaseModel):
    email_id: str
    created_at: str | None = None
    from_: str = Field(alias="from")
    to: list[str] = Field(default_factory=list)
    bcc: list[str] = Field(default_factory=list)
    cc: list[str] = Field(default_factory=list)
    received_for: list[str] = Field(default_factory=list)
    message_id: str | None = None
    subject: str | None = None
    attachments: list[ResendAttachment] = Field(default_factory=list)
    body_text: str | None = None
    body_html: str | None = None


class ResendWebhookPayload(BaseModel):
    type: str
    created_at: str | None = None
    data: ResendWebhookData


class InboundEmail(BaseModel):
    sender_email: EmailStr = Field(max_length=255)
    sender_name: str | None = Field(default=None, max_length=255)
    subject: str = Field(min_length=1, max_length=255)
    body_text: str = Field(min_length=1, max_length=5000)
    body_html: str | None = Field(default=None, max_length=5000)

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


class TicketDetailOut(BaseModel):
    id: uuid.UUID
    sender_email: str
    sender_name: str | None
    subject: str
    body_text: str
    body_html: str | None
    status: TicketStatus
    category: TicketCategory | None
    assigned_to: uuid.UUID | None
    assignee_name: str | None
    replies: list[ReplyOut]
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
                    "body_text": data.body_text,
                    "body_html": data.body_html,
                    "status": data.status,
                    "category": data.category,
                    "assigned_to": data.assigned_to,
                    "replies": data.replies,
                    "created_at": data.created_at,
                    "updated_at": data.updated_at,
                    "assignee_name": name,
                }
        return data


class TicketPaginatedOut(BaseModel):
    items: list[TicketListOut]
    total: int


class TicketUpdate(BaseModel):
    assigned_to: uuid.UUID | None = None
    status: TicketStatus | None = None
    category: TicketCategory | None = None


class AgentOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str

    model_config = {"from_attributes": True}


class SummarizeResponse(BaseModel):
    summary: str
