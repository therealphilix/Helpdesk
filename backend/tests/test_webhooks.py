from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.ticket_reply import TicketReply
from app.models.user import User
from app.models.enums import SenderType, TicketStatus

WEBHOOK_HEADERS = {"X-Webhook-Secret": "test-webhook-secret"}


def _payload(
    from_: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
    email_id: str = "test-email-001",
) -> dict:
    return {
        "type": "email.received",
        "created_at": "2026-08-05T12:00:00Z",
        "data": {
            "email_id": email_id,
            "from": from_,
            "to": ["support@helpdesk.com"],
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
        },
    }


async def test_inbound_email_creates_ticket(
    client: AsyncClient, db_session: AsyncSession, ai_agent_user: User
):
    resp = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="Jane Doe <student@university.edu>",
            subject="Cannot access my course materials",
            body_text="Hi, I'm unable to open the lecture slides for CS101. Can you help?",
        ),
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["sender_email"] == "student@university.edu"
    assert data["sender_name"] == "Jane Doe"
    assert data["subject"] == "Cannot access my course materials"
    assert data["status"] == "new"
    assert data["category"] is None
    assert data["assigned_to"] == str(ai_agent_user.id)
    assert data["body_html"] is None
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data

    result = await db_session.execute(
        select(Ticket).where(Ticket.id == data["id"])
    )
    ticket = result.scalar_one()
    assert ticket.sender_email == "student@university.edu"
    assert ticket.status == TicketStatus.NEW
    assert ticket.assigned_to == ai_agent_user.id


async def test_inbound_email_missing_required_fields(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json={"not": "a valid payload"},
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 422


async def test_inbound_email_duplicate_is_idempotent(
    client: AsyncClient, db_session: AsyncSession, ai_agent_user: User
):
    payload = _payload(
        from_="Duplicate User <dup@university.edu>",
        subject="Help with enrollment",
        body_text="I need help enrolling in a course.",
    )

    resp1 = await client.post("/api/webhooks/email", json=payload, headers=WEBHOOK_HEADERS)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/webhooks/email", json=payload, headers=WEBHOOK_HEADERS)
    assert resp2.status_code == 200
    assert resp2.json()["id"] == resp1.json()["id"]

    count = await db_session.execute(select(Ticket))
    assert len(count.scalars().all()) == 1


async def test_inbound_email_different_body_creates_reply(
    client: AsyncClient, db_session: AsyncSession, ai_agent_user: User
):
    resp1 = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="multi@university.edu",
            subject="Billing question",
            body_text="I was charged twice for this month.",
        ),
        headers=WEBHOOK_HEADERS,
    )
    assert resp1.status_code == 201
    ticket_id = resp1.json()["id"]

    resp2 = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="multi@university.edu",
            subject="Billing question",
            body_text="When will my refund be processed?",
            email_id="test-email-002",
        ),
        headers=WEBHOOK_HEADERS,
    )
    assert resp2.status_code == 200
    assert resp2.json()["id"] == ticket_id

    tickets = await db_session.execute(select(Ticket))
    assert len(tickets.scalars().all()) == 1

    replies = await db_session.execute(
        select(TicketReply).where(TicketReply.ticket_id == ticket_id)
    )
    reply_list = replies.scalars().all()
    assert len(reply_list) == 1
    assert reply_list[0].body_text == "When will my refund be processed?"
    assert reply_list[0].sender_type == SenderType.CUSTOMER


async def test_inbound_email_reply_updates_sender_name(
    client: AsyncClient, db_session: AsyncSession, ai_agent_user: User
):
    resp1 = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="Old Name <changer@university.edu>",
            subject="Name change",
            body_text="First message.",
        ),
        headers=WEBHOOK_HEADERS,
    )
    assert resp1.status_code == 201

    resp2 = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="New Name <changer@university.edu>",
            subject="Name change",
            body_text="Follow-up message.",
            email_id="test-email-003",
        ),
        headers=WEBHOOK_HEADERS,
    )
    assert resp2.status_code == 200
    assert resp2.json()["sender_name"] == "New Name"


async def test_inbound_email_minimal_fields(client: AsyncClient, ai_agent_user: User):
    resp = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="minimal@university.edu",
            subject="x",
            body_text="x",
        ),
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["sender_name"] is None
    assert data["body_html"] is None


async def test_webhook_missing_secret_header(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="student@university.edu",
            subject="Test",
            body_text="Hello",
        ),
    )
    assert resp.status_code == 401


async def test_webhook_invalid_secret_header(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="student@university.edu",
            subject="Test",
            body_text="Hello",
        ),
        headers={"X-Webhook-Secret": "wrong-secret"},
    )
    assert resp.status_code == 401


async def test_webhook_ignores_non_email_event(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json={
            "type": "email.delivered",
            "data": {"email_id": "xxx", "from": "a@b.com"},
        },
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored", "type": "email.delivered"}


async def test_inbound_email_strips_re_prefixes(client: AsyncClient, ai_agent_user: User):
    resp = await client.post(
        "/api/webhooks/email",
        json=_payload(
            from_="student@university.edu",
            subject="Re: Fwd: RE: Actual Subject",
            body_text="Body content.",
        ),
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 201
    assert resp.json()["subject"] == "Actual Subject"
