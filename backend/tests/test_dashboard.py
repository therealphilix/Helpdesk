from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import TicketStatus
from app.models.ticket import Ticket
from app.models.user import User


async def _create_ticket(
    db_session: AsyncSession,
    status: TicketStatus = TicketStatus.OPEN,
    assigned_to: str | None = None,
    sender_email: str = "student@test.com",
) -> Ticket:
    ticket = Ticket(
        sender_email=sender_email,
        subject=f"Ticket {status}",
        body_text="Test body.",
        status=status,
        assigned_to=assigned_to,
    )
    db_session.add(ticket)
    await db_session.commit()
    await db_session.refresh(ticket)
    return ticket


async def test_dashboard_stats_empty(
    auth_client: AsyncClient,
):
    resp = await auth_client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_tickets"] == 0
    assert data["open_tickets"] == 0
    assert data["ai_resolved_count"] == 0
    assert data["ai_resolved_percentage"] == 0
    assert data["avg_resolution_time_hours"] == 0


async def test_dashboard_stats_requires_auth(client: AsyncClient):
    resp = await client.get("/api/dashboard/stats")
    assert resp.status_code == 401


async def test_dashboard_stats_counts(
    db_session: AsyncSession,
    auth_client: AsyncClient,
    ai_agent_user: User,
):
    await _create_ticket(db_session, TicketStatus.OPEN)
    await _create_ticket(db_session, TicketStatus.OPEN)
    await _create_ticket(db_session, TicketStatus.RESOLVED, assigned_to=ai_agent_user.id)
    await _create_ticket(db_session, TicketStatus.RESOLVED, assigned_to=ai_agent_user.id)
    await _create_ticket(db_session, TicketStatus.RESOLVED)
    await _create_ticket(db_session, TicketStatus.CLOSED)

    resp = await auth_client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_tickets"] == 6
    assert data["open_tickets"] == 2
    assert data["ai_resolved_count"] == 2
    assert data["ai_resolved_percentage"] == round(2 / 3 * 100, 2)
    assert data["avg_resolution_time_hours"] >= 0


async def test_dashboard_stats_excludes_new_processing(
    db_session: AsyncSession,
    auth_client: AsyncClient,
):
    await _create_ticket(db_session, TicketStatus.NEW)
    await _create_ticket(db_session, TicketStatus.PROCESSING)
    await _create_ticket(db_session, TicketStatus.OPEN)
    await _create_ticket(db_session, TicketStatus.RESOLVED)

    resp = await auth_client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_tickets"] == 2
    assert data["open_tickets"] == 1
