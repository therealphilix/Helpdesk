import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.ticket_reply import TicketReply
from app.models.enums import SenderType, TicketStatus


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
        status=TicketStatus.OPEN,
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


# ── Reply Tests ───────────────────────────────────────────────────────────

async def _create_reply(
    db_session: AsyncSession,
    ticket_id,
    author_id,
    sender_type: SenderType = SenderType.AGENT,
    body_text: str = "This is a reply.",
) -> TicketReply:
    reply = TicketReply(
        ticket_id=ticket_id,
        author_id=author_id,
        sender_type=sender_type,
        body_text=body_text,
    )
    db_session.add(reply)
    await db_session.commit()
    await db_session.refresh(reply)
    return reply


async def test_list_replies_returns_replies(
    db_session: AsyncSession, auth_client: AsyncClient, admin_user
):
    ticket = await _create_ticket(db_session, subject="Ticket with reply")
    await _create_reply(db_session, ticket.id, admin_user.id, body_text="First reply")
    await _create_reply(db_session, ticket.id, admin_user.id, body_text="Second reply")

    resp = await auth_client.get(f"/api/tickets/{ticket.id}/replies")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["body_text"] == "First reply"
    assert data[1]["body_text"] == "Second reply"
    assert data[0]["sender_type"] == "agent"
    assert data[0]["author_name"] == admin_user.name


async def test_list_replies_empty(db_session: AsyncSession, auth_client: AsyncClient):
    ticket = await _create_ticket(db_session)

    resp = await auth_client.get(f"/api/tickets/{ticket.id}/replies")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_reply_succeeds(
    db_session: AsyncSession, auth_client: AsyncClient, admin_user
):
    ticket = await _create_ticket(db_session)

    resp = await auth_client.post(
        f"/api/tickets/{ticket.id}/replies",
        json={"body_text": "I am replying to this ticket."},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["body_text"] == "I am replying to this ticket."
    assert data["sender_type"] == "agent"
    assert data["author_id"] == str(admin_user.id)
    assert data["author_name"] == admin_user.name
    assert data["ticket_id"] == str(ticket.id)
    assert "id" in data
    assert "created_at" in data


async def test_create_reply_empty_body(db_session: AsyncSession, auth_client: AsyncClient):
    ticket = await _create_ticket(db_session)

    resp = await auth_client.post(
        f"/api/tickets/{ticket.id}/replies",
        json={"body_text": ""},
    )
    assert resp.status_code == 422


async def test_create_reply_ticket_not_found(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/tickets/00000000-0000-0000-0000-000000000000/replies",
        json={"body_text": "Reply to nothing"},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Ticket not found"


async def test_unauthenticated_cannot_create_reply(client: AsyncClient):
    resp = await client.post(
        "/api/tickets/00000000-0000-0000-0000-000000000000/replies",
        json={"body_text": "Unauthenticated reply"},
    )
    assert resp.status_code == 401


async def test_unauthenticated_cannot_list_replies(client: AsyncClient):
    resp = await client.get(
        "/api/tickets/00000000-0000-0000-0000-000000000000/replies"
    )
    assert resp.status_code == 401


async def test_agent_can_create_reply(
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

    ticket = await _create_ticket(db_session)

    client.cookies.set("session", session.token)
    resp = await client.post(
        f"/api/tickets/{ticket.id}/replies",
        json={"body_text": "Agent reply"},
    )
    assert resp.status_code == 201
    assert resp.json()["author_id"] == str(agent_user.id)
    assert resp.json()["author_name"] == agent_user.name


async def test_get_ticket_includes_replies(
    db_session: AsyncSession, auth_client: AsyncClient, admin_user
):
    ticket = await _create_ticket(db_session, subject="Ticket with replies")
    await _create_reply(db_session, ticket.id, admin_user.id, body_text="Reply 1")
    await _create_reply(db_session, ticket.id, admin_user.id, body_text="Reply 2")

    resp = await auth_client.get(f"/api/tickets/{ticket.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "replies" in data
    assert len(data["replies"]) == 2
    assert data["replies"][0]["body_text"] == "Reply 1"
    assert data["replies"][1]["body_text"] == "Reply 2"
    assert data["replies"][0]["sender_type"] == "agent"
    assert data["replies"][0]["author_name"] == admin_user.name


async def test_get_ticket_replies_ordered_chronologically(
    db_session: AsyncSession, auth_client: AsyncClient, admin_user
):
    ticket = await _create_ticket(db_session)
    await _create_reply(db_session, ticket.id, admin_user.id, body_text="First")
    await _create_reply(db_session, ticket.id, admin_user.id, body_text="Second")
    await _create_reply(db_session, ticket.id, admin_user.id, body_text="Third")

    resp = await auth_client.get(f"/api/tickets/{ticket.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["replies"]) == 3
    assert data["replies"][0]["body_text"] == "First"
    assert data["replies"][1]["body_text"] == "Second"
    assert data["replies"][2]["body_text"] == "Third"


# ── Polish Tests ──────────────────────────────────────────────────────────

from unittest.mock import AsyncMock, MagicMock, patch


async def test_polish_reply_returns_polished_text_with_salutation_and_signature(
    db_session: AsyncSession, auth_client: AsyncClient, admin_user
):
    ticket = await _create_ticket(
        db_session, sender_name="Jane Doe", subject="Need help"
    )

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Polished body text."

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.routers.tickets.AsyncOpenAI", return_value=mock_client):
        resp = await auth_client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": "rough draft reply"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["polished"].startswith("Hi Jane,\n\n")
    assert "Polished body text." in data["polished"]
    assert data["polished"].endswith(f"Best regards,\n{admin_user.name}\nhttps://helpdesk.com")


async def test_polish_reply_fallback_salutation_when_no_sender_name(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(
        db_session, sender_name=None, subject="Anonymous"
    )

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Polished body."

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.routers.tickets.AsyncOpenAI", return_value=mock_client):
        resp = await auth_client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": "draft"},
        )

    assert resp.status_code == 200
    assert resp.json()["polished"].startswith("Hi there,\n\n")


async def test_polish_reply_strips_existing_salutation_and_signature_on_repolish(
    db_session: AsyncSession, auth_client: AsyncClient, admin_user
):
    ticket = await _create_ticket(
        db_session, sender_name="Jane Doe", subject="Re-polish"
    )

    polished_with_trimmings = (
        "Hi Jane,\n\n"
        "Polished content.\n\n"
        f"Best regards,\n{admin_user.name}\nhttps://helpdesk.com"
    )

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Polished content."

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.routers.tickets.AsyncOpenAI", return_value=mock_client):
        resp = await auth_client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": polished_with_trimmings},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["polished"] == (
        "Hi Jane,\n\nPolished content.\n\n"
        f"Best regards,\n{admin_user.name}\nhttps://helpdesk.com"
    )


async def test_polish_reply_missing_api_key_returns_500(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(db_session, subject="No API key")

    with patch("app.routers.tickets.settings.OPENAI_API_KEY", ""):
        resp = await auth_client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": "draft reply"},
        )

    assert resp.status_code == 500
    assert resp.json()["detail"] == "OPENAI_API_KEY is not configured"


async def test_polish_reply_ticket_not_found_returns_404(
    auth_client: AsyncClient
):
    resp = await auth_client.post(
        "/api/tickets/00000000-0000-0000-0000-000000000000/replies/polish",
        json={"draft": "draft reply"},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Ticket not found"


async def test_polish_reply_empty_draft_returns_422(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(db_session)

    resp = await auth_client.post(
        f"/api/tickets/{ticket.id}/replies/polish",
        json={"draft": ""},
    )
    assert resp.status_code == 422


async def test_polish_reply_unauthenticated_returns_401(
    client: AsyncClient
):
    resp = await client.post(
        "/api/tickets/00000000-0000-0000-0000-000000000000/replies/polish",
        json={"draft": "draft reply"},
    )
    assert resp.status_code == 401


async def test_agent_can_polish_reply(
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

    ticket = await _create_ticket(db_session, subject="Agent polish")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Agent polished text."

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.routers.tickets.AsyncOpenAI", return_value=mock_client):
        client.cookies.set("session", session.token)
        resp = await client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": "draft"},
        )

    assert resp.status_code == 200
    assert f"Best regards,\n{agent_user.name}" in resp.json()["polished"]


async def test_polish_reply_ai_error_returns_502(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(db_session, subject="AI error")

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=Exception("DeepSeek API timeout")
    )

    with patch("app.routers.tickets.AsyncOpenAI", return_value=mock_client):
        resp = await auth_client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": "draft reply"},
        )

    assert resp.status_code == 502
    assert "AI polish failed" in resp.json()["detail"]


async def test_polish_reply_sends_ticket_context_to_ai(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(
        db_session,
        sender_name="Alice",
        subject="Login broken",
        body_text="I cannot log in at all.",
    )
    ticket.category = "technical question"
    await db_session.commit()

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Refined reply."

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.routers.tickets.AsyncOpenAI", return_value=mock_client):
        resp = await auth_client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": "Try restarting your browser."},
        )

    assert resp.status_code == 200

    call_args = mock_client.chat.completions.create.call_args[1]
    user_msg = call_args["messages"][1]["content"]
    assert "Login broken" in user_msg
    assert "I cannot log in at all." in user_msg
    assert "technical question" in user_msg
    assert "Try restarting your browser." in user_msg


async def test_polish_reply_uses_configured_model(
    db_session: AsyncSession, auth_client: AsyncClient
):
    ticket = await _create_ticket(db_session, subject="Model config")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Refined."

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.routers.tickets.AsyncOpenAI", return_value=mock_client):
        resp = await auth_client.post(
            f"/api/tickets/{ticket.id}/replies/polish",
            json={"draft": "draft"},
        )

    assert resp.status_code == 200
    call_args = mock_client.chat.completions.create.call_args[1]
    assert call_args["model"] == "deepseek-chat"
    assert call_args["temperature"] == 0.7
    assert call_args["max_tokens"] == 2048
