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


async def test_get_ticket_returns_full_detail(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(
        db_session,
        sender_email="jane@test.com",
        sender_name="Jane Doe",
        subject="Login problem",
        body_text="Cannot log into the portal.",
    )

    resp = await auth_client.get(f"/api/tickets/{ticket.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(ticket.id)
    assert data["sender_email"] == "jane@test.com"
    assert data["sender_name"] == "Jane Doe"
    assert data["subject"] == "Login problem"
    assert data["body_text"] == "Cannot log into the portal."
    assert data["body_html"] is None
    assert data["status"] == "open"
    assert data["category"] is None
    assert data["assigned_to"] is None
    assert data["assignee_name"] is None
    assert "created_at" in data
    assert "updated_at" in data


async def test_get_ticket_includes_assignee_name(
    db_session: AsyncSession, auth_client: AsyncClient, agent_user
):
    ticket = await _create_ticket(db_session, subject="Assigned detail")
    ticket.assigned_to = agent_user.id
    await db_session.commit()

    resp = await auth_client.get(f"/api/tickets/{ticket.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert str(data["assigned_to"]) == str(agent_user.id)
    assert data["assignee_name"] == agent_user.name


async def test_get_ticket_not_found(
    db_session: AsyncSession, auth_client: AsyncClient
):
    resp = await auth_client.get(f"/api/tickets/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Ticket not found"


async def test_agent_can_get_ticket(
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

    ticket = await _create_ticket(db_session, subject="Agent detail")

    client.cookies.set("session", session.token)
    resp = await client.get(f"/api/tickets/{ticket.id}")
    assert resp.status_code == 200
    assert resp.json()["subject"] == "Agent detail"


async def test_unauthenticated_cannot_get_ticket(client: AsyncClient):
    resp = await client.get("/api/tickets/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401


async def test_update_ticket_assign(
    db_session: AsyncSession, auth_client: AsyncClient, agent_user
):
    ticket = await _create_ticket(db_session, subject="Needs assignment")

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={"assigned_to": str(agent_user.id)},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert str(data["assigned_to"]) == str(agent_user.id)
    assert data["assignee_name"] == agent_user.name


async def test_update_ticket_unassign(
    db_session: AsyncSession, auth_client: AsyncClient, agent_user
):
    ticket = await _create_ticket(db_session, subject="Was assigned")
    ticket.assigned_to = agent_user.id
    await db_session.commit()

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={"assigned_to": None},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["assigned_to"] is None
    assert data["assignee_name"] is None


async def test_update_ticket_status(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(db_session, subject="Status change")

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={"status": "resolved"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"


async def test_update_ticket_category(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(db_session, subject="Category change")

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={"category": "technical question"},
    )
    assert resp.status_code == 200
    assert resp.json()["category"] == "technical question"


async def test_update_ticket_clear_category(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(db_session, subject="Clear category")
    ticket.category = "general question"
    await db_session.commit()

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={"category": None},
    )
    assert resp.status_code == 200
    assert resp.json()["category"] is None


async def test_update_ticket_multiple_fields(
    db_session: AsyncSession, auth_client: AsyncClient, agent_user
):
    ticket = await _create_ticket(db_session, subject="Multi update")

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={
            "status": "resolved",
            "category": "technical question",
            "assigned_to": str(agent_user.id),
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "resolved"
    assert data["category"] == "technical question"
    assert str(data["assigned_to"]) == str(agent_user.id)


async def test_update_ticket_empty_body_no_change(
    db_session: AsyncSession, auth_client: AsyncClient, agent_user
):
    ticket = await _create_ticket(db_session, subject="No change")
    ticket.assigned_to = agent_user.id
    ticket.status = "resolved"
    ticket.category = "technical question"
    await db_session.commit()

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "resolved"
    assert data["category"] == "technical question"
    assert str(data["assigned_to"]) == str(agent_user.id)


async def test_update_ticket_invalid_user(
    db_session: AsyncSession, auth_client: AsyncClient
):
    import uuid as _uuid
    ticket = await _create_ticket(db_session)

    resp = await auth_client.patch(
        f"/api/tickets/{ticket.id}",
        json={"assigned_to": str(_uuid.uuid4())},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Assigned user not found"


async def test_update_ticket_not_found(auth_client: AsyncClient):
    resp = await auth_client.patch(
        "/api/tickets/00000000-0000-0000-0000-000000000000",
        json={"assigned_to": None},
    )
    assert resp.status_code == 404


async def test_agent_can_update_ticket(
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

    ticket = await _create_ticket(db_session, subject="Agent assigns")

    client.cookies.set("session", session.token)
    resp = await client.patch(
        f"/api/tickets/{ticket.id}",
        json={"assigned_to": str(agent_user.id)},
    )
    assert resp.status_code == 200
    assert str(resp.json()["assigned_to"]) == str(agent_user.id)


async def test_unauthenticated_cannot_update_ticket(client: AsyncClient):
    resp = await client.patch(
        "/api/tickets/00000000-0000-0000-0000-000000000000",
        json={"assigned_to": None},
    )
    assert resp.status_code == 401


async def test_list_agents_returns_only_agents(
    db_session: AsyncSession, auth_client: AsyncClient, admin_user, agent_user
):
    resp = await auth_client.get("/api/tickets/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == str(agent_user.id)
    assert data[0]["name"] == agent_user.name
    assert data[0]["email"] == agent_user.email


async def test_agent_can_list_agents(
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

    client.cookies.set("session", session.token)
    resp = await client.get("/api/tickets/agents")
    assert resp.status_code == 200


async def test_unauthenticated_cannot_list_agents(client: AsyncClient):
    resp = await client.get("/api/tickets/agents")
    assert resp.status_code == 401
