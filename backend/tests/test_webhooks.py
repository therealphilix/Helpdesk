from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.ticket_reply import TicketReply
from app.models.enums import SenderType, TicketStatus

WEBHOOK_HEADERS = {"X-Webhook-Secret": "test-webhook-secret"}


async def test_inbound_email_creates_ticket(
    client: AsyncClient, db_session: AsyncSession
):
    resp = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "student@university.edu",
            "sender_name": "Jane Doe",
            "subject": "Cannot access my course materials",
            "body_text": "Hi, I'm unable to open the lecture slides for CS101. Can you help?",
        },
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["sender_email"] == "student@university.edu"
    assert data["sender_name"] == "Jane Doe"
    assert data["subject"] == "Cannot access my course materials"
    assert data["status"] == "open"
    assert data["category"] is None
    assert data["assigned_to"] is None
    assert data["body_html"] is None
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data

    result = await db_session.execute(
        select(Ticket).where(Ticket.id == data["id"])
    )
    ticket = result.scalar_one()
    assert ticket.sender_email == "student@university.edu"
    assert ticket.status == TicketStatus.OPEN


async def test_inbound_email_missing_required_fields(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "student@university.edu",
        },
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 422


async def test_inbound_email_duplicate_is_idempotent(
    client: AsyncClient, db_session: AsyncSession
):
    payload = {
        "sender_email": "dup@university.edu",
        "sender_name": "Duplicate User",
        "subject": "Help with enrollment",
        "body_text": "I need help enrolling in a course.",
    }

    resp1 = await client.post("/api/webhooks/email", json=payload, headers=WEBHOOK_HEADERS)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/webhooks/email", json=payload, headers=WEBHOOK_HEADERS)
    assert resp2.status_code == 200
    assert resp2.json()["id"] == resp1.json()["id"]

    count = await db_session.execute(select(Ticket))
    assert len(count.scalars().all()) == 1


async def test_inbound_email_different_body_creates_reply(
    client: AsyncClient, db_session: AsyncSession
):
    resp1 = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "multi@university.edu",
            "subject": "Billing question",
            "body_text": "I was charged twice for this month.",
        },
        headers=WEBHOOK_HEADERS,
    )
    assert resp1.status_code == 201
    ticket_id = resp1.json()["id"]

    resp2 = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "multi@university.edu",
            "subject": "Billing question",
            "body_text": "When will my refund be processed?",
        },
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
    client: AsyncClient, db_session: AsyncSession
):
    resp1 = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "changer@university.edu",
            "sender_name": "Old Name",
            "subject": "Name change",
            "body_text": "First message.",
        },
        headers=WEBHOOK_HEADERS,
    )
    assert resp1.status_code == 201

    resp2 = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "changer@university.edu",
            "sender_name": "New Name",
            "subject": "Name change",
            "body_text": "Follow-up message.",
        },
        headers=WEBHOOK_HEADERS,
    )
    assert resp2.status_code == 200
    assert resp2.json()["sender_name"] == "New Name"


async def test_inbound_email_minimal_fields(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "minimal@university.edu",
            "subject": "x",
            "body_text": "x",
        },
        headers=WEBHOOK_HEADERS,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["sender_name"] is None
    assert data["body_html"] is None


async def test_webhook_missing_secret_header(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "student@university.edu",
            "subject": "Test",
            "body_text": "Hello",
        },
    )
    assert resp.status_code == 401


async def test_webhook_invalid_secret_header(client: AsyncClient):
    resp = await client.post(
        "/api/webhooks/email",
        json={
            "sender_email": "student@university.edu",
            "subject": "Test",
            "body_text": "Hello",
        },
        headers={"X-Webhook-Secret": "wrong-secret"},
    )
    assert resp.status_code == 401
