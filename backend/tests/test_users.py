import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_session_token, hash_password, session_expiry
from app.models.enums import UserRole
from app.models.session import Session
from app.models.user import User


async def _create_user(
    db_session: AsyncSession,
    email: str,
    name: str,
    role: UserRole,
    is_active: bool = True,
) -> User:
    user = User(
        email=email,
        name=name,
        password_hash=hash_password("SomePass123!"),
        role=role,
        is_active=is_active,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_admin_can_list_users(
    db_session: AsyncSession, auth_client: AsyncClient
):
    resp = await auth_client.get("/api/users")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["email"] == "admin@test.com"
    assert data[0]["role"] == "admin"
    assert "is_active" in data[0]


async def test_users_includes_agent(
    db_session: AsyncSession, auth_client: AsyncClient
):
    await _create_user(db_session, "agent2@test.com", "Agent Two", UserRole.AGENT)

    resp = await auth_client.get("/api/users")
    assert resp.status_code == 200
    data = resp.json()
    emails = {u["email"] for u in data}
    assert "agent2@test.com" in emails


async def test_users_includes_inactive(
    db_session: AsyncSession, auth_client: AsyncClient
):
    await _create_user(
        db_session, "inactive@test.com", "Inactive User", UserRole.AGENT, is_active=False
    )

    resp = await auth_client.get("/api/users")
    assert resp.status_code == 200
    data = resp.json()
    inactive = next(
        (u for u in data if u["email"] == "inactive@test.com"), None
    )
    assert inactive is not None
    assert inactive["is_active"] is False


async def test_agent_cannot_list_users(
    db_session: AsyncSession, client: AsyncClient, agent_user: User
):
    session = Session(user_id=agent_user.id, token=generate_session_token(), expires_at=session_expiry())
    db_session.add(session)
    await db_session.commit()

    client.cookies.set("session", session.token)
    resp = await client.get("/api/users")
    assert resp.status_code == 403


async def test_unauthenticated_cannot_list_users(client: AsyncClient):
    resp = await client.get("/api/users")
    assert resp.status_code == 401


async def test_users_ordered_by_created_desc(
    db_session: AsyncSession, auth_client: AsyncClient
):
    await _create_user(db_session, "first@test.com", "First", UserRole.AGENT)
    await _create_user(db_session, "second@test.com", "Second", UserRole.AGENT)

    resp = await auth_client.get("/api/users")
    data = resp.json()

    created_dates = [u["created_at"] for u in data]
    assert created_dates == sorted(created_dates, reverse=True)
