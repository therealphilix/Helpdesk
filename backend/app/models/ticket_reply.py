import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base
from .enums import SenderType


class TicketReply(Base):
    __tablename__ = "ticket_replies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    author_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    sender_type: Mapped[SenderType] = mapped_column(String(20), nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="replies")
    author: Mapped["User | None"] = relationship("User")
