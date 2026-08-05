import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import TicketStatus
from app.models.ticket import Ticket
from app.services.email_service import send_reply_email


async def _create_test_ticket(db_session: AsyncSession, sender_email: str = "student@test.edu") -> Ticket:
    ticket = Ticket(
        sender_email=sender_email,
        subject="Test Subject",
        body_text="Test body for email.",
        status=TicketStatus.OPEN,
    )
    db_session.add(ticket)
    await db_session.commit()
    await db_session.refresh(ticket)
    return ticket


@pytest.mark.parametrize("missing", ["resend_key", "from_email"])
async def test_send_reply_email_skips_when_not_configured(
    db_session: AsyncSession, monkeypatch, missing: str
):
    ticket = await _create_test_ticket(db_session)

    if missing == "resend_key":
        monkeypatch.setattr("app.services.email_service.settings.RESEND_API_KEY", "")
    else:
        monkeypatch.setattr("app.services.email_service.settings.FROM_EMAIL", "")

    await send_reply_email({}, ticket.id, "Hello customer")


async def test_send_reply_email_ticket_not_found():
    with patch("app.services.email_service.async_session") as mock_session_factory:
        mock_session = AsyncMock()
        mock_session.get.return_value = None
        mock_session.__aenter__.return_value = mock_session
        mock_session_factory.return_value = mock_session

        await send_reply_email({}, uuid.uuid4(), "Hello customer")


async def test_send_reply_email_sends_correct_params(monkeypatch):
    monkeypatch.setattr("app.services.email_service.settings.RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr("app.services.email_service.settings.FROM_EMAIL", "Support <support@helpdesk.com>")

    ticket = MagicMock()
    ticket.sender_email = "student@test.edu"
    ticket.subject = "Test Subject"

    with (
        patch("app.services.email_service.async_session") as mock_session_factory,
        patch("app.services.email_service.resend.Emails.send") as mock_send,
    ):
        mock_session = AsyncMock()
        mock_session.get.return_value = ticket
        mock_session.__aenter__.return_value = mock_session
        mock_session_factory.return_value = mock_session

        await send_reply_email({}, uuid.uuid4(), "Hello, here is the reply.", "<p>Hello</p>")

        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        assert call_args["from"] == "Support <support@helpdesk.com>"
        assert call_args["to"] == ["student@test.edu"]
        assert call_args["subject"] == "Re: Test Subject"
        assert call_args["text"] == "Hello, here is the reply."
        assert call_args["html"] == "<p>Hello</p>"


async def test_send_reply_email_omits_html_when_none(monkeypatch):
    monkeypatch.setattr("app.services.email_service.settings.RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr("app.services.email_service.settings.FROM_EMAIL", "Support <support@helpdesk.com>")

    ticket = MagicMock()
    ticket.sender_email = "student@test.edu"
    ticket.subject = "Test Subject"

    with (
        patch("app.services.email_service.async_session") as mock_session_factory,
        patch("app.services.email_service.resend.Emails.send") as mock_send,
    ):
        mock_session = AsyncMock()
        mock_session.get.return_value = ticket
        mock_session.__aenter__.return_value = mock_session
        mock_session_factory.return_value = mock_session

        await send_reply_email({}, uuid.uuid4(), "Plain text reply.")

        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        assert "html" not in call_args
        assert call_args["text"] == "Plain text reply."
