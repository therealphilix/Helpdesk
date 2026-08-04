import os

os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://helpdesk:helpdesk@localhost:5432/helpdesk_test",
)
os.environ["REDIS_URL"] = os.getenv("TEST_REDIS_URL", "redis://localhost:6379/1")
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["WEBHOOK_SECRET"] = "test-webhook-secret"
os.environ["OPENAI_API_KEY"] = "test-openai-key"
os.environ["OPENAI_MODEL"] = "deepseek-chat"

from collections.abc import AsyncGenerator
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import generate_session_token, hash_password, session_expiry
from app.main import app
from app.models import Session, User
from app.models.enums import UserRole

TEST_DATABASE_URL = os.environ["DATABASE_URL"]


_DASHBOARD_STATS_FN = """
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(
    total_tickets bigint,
    open_tickets bigint,
    ai_resolved_count bigint,
    ai_resolved_percentage numeric,
    avg_resolution_time_hours numeric
) AS $$
DECLARE
    ai_user_id uuid;
BEGIN
    SELECT id INTO ai_user_id FROM users WHERE email = 'ai@helpdesk.com';

    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE t.status NOT IN ('new', 'processing'))::bigint,
        COUNT(*) FILTER (WHERE t.status = 'open')::bigint,
        COUNT(*) FILTER (WHERE t.status = 'resolved' AND t.assigned_to = ai_user_id)::bigint,
        CASE
            WHEN COUNT(*) FILTER (WHERE t.status = 'resolved') > 0
            THEN ROUND(
                COUNT(*) FILTER (WHERE t.status = 'resolved' AND t.assigned_to = ai_user_id)::numeric
                / COUNT(*) FILTER (WHERE t.status = 'resolved')::numeric * 100, 2
            )
            ELSE 0
        END,
        ROUND(
            COALESCE(
                AVG(
                    EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600
                ) FILTER (WHERE t.status = 'resolved'),
                0
            )::numeric, 2
        )
    FROM tickets t;
END;
$$ LANGUAGE plpgsql;
"""

_TICKETS_PER_DAY_FN = """
CREATE OR REPLACE FUNCTION get_tickets_per_day()
RETURNS TABLE(
    date text,
    count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'::interval
        )::date AS day
    )
    SELECT
        ds.day::text,
        COUNT(t.id)::bigint
    FROM date_series ds
    LEFT JOIN tickets t ON DATE(t.created_at) = ds.day
    GROUP BY ds.day
    ORDER BY ds.day;
END;
$$ LANGUAGE plpgsql;
"""


class _MockArqRedis:
    async def enqueue_job(self, name: str, *args: Any, **kwargs: Any) -> None:
        pass

    async def close(self) -> None:
        pass


def _make_engine():
    return create_async_engine(TEST_DATABASE_URL, echo=False)


async def _ensure_tables(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@pytest_asyncio.fixture
async def engine():
    eng = _make_engine()
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("DROP FUNCTION IF EXISTS get_dashboard_stats();"))
        await conn.execute(text("DROP FUNCTION IF EXISTS get_tickets_per_day();"))
        await conn.execute(text(_DASHBOARD_STATS_FN))
        await conn.execute(text(_TICKETS_PER_DAY_FN))
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    sessionmaker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with sessionmaker() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.state.arq_redis = _MockArqRedis()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin@test.com",
        name="Test Admin",
        password_hash=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def agent_user(db_session: AsyncSession) -> User:
    user = User(
        email="agent@test.com",
        name="Test Agent",
        password_hash=hash_password("AgentPass123!"),
        role=UserRole.AGENT,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_session(db_session: AsyncSession, admin_user: User) -> Session:
    session = Session(
        user_id=admin_user.id,
        token=generate_session_token(),
        expires_at=session_expiry(),
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture
async def ai_agent_user(db_session: AsyncSession) -> User:
    user = User(
        email="ai@helpdesk.com",
        name="AI Assistant",
        password_hash=hash_password("AIAgent_Secret123!"),
        role=UserRole.AGENT,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_client(
    client: AsyncClient, admin_user: User, admin_session: Session
) -> AsyncGenerator[AsyncClient, None]:
    client.cookies.set("session", admin_session.token)
    yield client
