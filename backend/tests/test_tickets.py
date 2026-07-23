import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.enums import TicketStatus


async def _create_ticket(
    db_session: AsyncSession,
    sender_email: str = "student@test.com",
    sender_name: str | None = "Test Student",
    subject: str = "Test Ticket",
    body_text: str = "This is a test ticket.",
) -> Ticket:
    ticket = Ticket(
        sender_email=sender_email,
        sender_name=sender_name,
        subject=subject,
        body_text=body_text,
    )
    db_session.add(ticket)
    await db_session.commit()
    await db_session.refresh(ticket)
    return ticket


async def test_list_tickets_returns_newest_first(
    db_session: AsyncSession, auth_client: AsyncClient
):
    t1 = await _create_ticket(db_session, subject="First ticket")
    t2 = await _create_ticket(db_session, subject="Second ticket")

    resp = await auth_client.get("/api/tickets")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 2
    items = data["items"]
    assert items[0]["subject"] == "Second ticket"
    assert items[1]["subject"] == "First ticket"


async def test_list_tickets_includes_all_fields(
    db_session: AsyncSession, auth_client: AsyncClient
):
    await _create_ticket(
        db_session,
        sender_email="jane@test.com",
        sender_name="Jane Doe",
        subject="Need help with login",
        body_text="I can't log in.",
    )

    resp = await auth_client.get("/api/tickets")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    items = data["items"]
    assert len(items) == 1
    assert items[0]["sender_email"] == "jane@test.com"
    assert items[0]["sender_name"] == "Jane Doe"
    assert items[0]["subject"] == "Need help with login"
    assert items[0]["status"] == "open"
    assert items[0]["category"] is None
    assert items[0]["assigned_to"] is None
    assert items[0]["assignee_name"] is None
    assert "body_text" not in items[0]
    assert "body_html" not in items[0]
    assert "id" in items[0]
    assert "created_at" in items[0]
    assert "updated_at" in items[0]


async def test_list_tickets_shows_assignee_name(
    db_session: AsyncSession, auth_client: AsyncClient, agent_user
):
    ticket = await _create_ticket(db_session, subject="Assigned ticket")
    ticket.assigned_to = agent_user.id
    await db_session.commit()

    resp = await auth_client.get("/api/tickets")
    assert resp.status_code == 200
    data = resp.json()
    items = data["items"]
    assigned = [t for t in items if t["id"] == str(ticket.id)]
    assert len(assigned) == 1
    assert str(assigned[0]["assigned_to"]) == str(agent_user.id)
    assert assigned[0]["assignee_name"] == agent_user.name


async def test_agent_can_list_tickets(
    db_session: AsyncSession, client: AsyncClient, agent_user
):
    from app.core.security import generate_session_token, session_expiry
    from app.models.session import Session

    session = Session(
        user_id=agent_user.id,
        token=generate_session_token(),
        expires_at=session_expiry(),
    )
    db_session.add(session)
    await db_session.commit()

    await _create_ticket(db_session, subject="Agent viewable")

    client.cookies.set("session", session.token)
    resp = await client.get("/api/tickets")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


async def test_unauthenticated_cannot_list_tickets(client: AsyncClient):
    resp = await client.get("/api/tickets")
    assert resp.status_code == 401


async def test_list_tickets_empty(db_session: AsyncSession, auth_client: AsyncClient):
    resp = await auth_client.get("/api/tickets")
    assert resp.status_code == 200
    data = resp.json()
    assert data == {"items": [], "total": 0}
