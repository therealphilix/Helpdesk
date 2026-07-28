import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from ..models.enums import SenderType


class ReplyCreate(BaseModel):
    body_text: str = Field(min_length=1)
    body_html: str | None = Field(default=None)


class PolishRequest(BaseModel):
    draft: str = Field(min_length=1)


class PolishResponse(BaseModel):
    polished: str


class ReplyOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    sender_type: SenderType
    author_id: uuid.UUID | None
    author_name: str | None
    body_text: str
    body_html: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_author_name(cls, data: object) -> object:
        if hasattr(data, "author"):
            name = data.author.name if data.author is not None else None
            if isinstance(data, dict):
                data["author_name"] = name
            else:
                return {
                    "id": data.id,
                    "ticket_id": data.ticket_id,
                    "sender_type": data.sender_type,
                    "author_id": data.author_id,
                    "author_name": name,
                    "body_text": data.body_text,
                    "body_html": data.body_html,
                    "created_at": data.created_at,
                }
        return data
