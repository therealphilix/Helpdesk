"""Provision the test database — create if possible, create tables, seed admin + agent.

On first run you may need to create the test database manually:
  docker compose exec db createdb -U helpdesk helpdesk_test
  or via psql:  CREATE DATABASE helpdesk_test OWNER helpdesk;
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://helpdesk:helpdesk@localhost:5432/helpdesk_test",
)

TEST_DB_URL = os.environ["DATABASE_URL"]


def _parse_pg_url(url: str) -> dict:
    from urllib.parse import urlparse

    parsed = urlparse(url.replace("+asyncpg", ""))
    return {
        "user": parsed.username or "helpdesk",
        "password": parsed.password or "helpdesk",
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "db": url.rsplit("/", 1)[-1],
    }


async def _ensure_test_database() -> None:
    import asyncpg

    info = _parse_pg_url(TEST_DB_URL)
    db_name = info["db"]
    user = info["user"]

    try:
        conn = await asyncpg.connect(
            user=info["user"],
            password=info["password"],
            host=info["host"],
            port=info["port"],
            database="postgres",
        )
        try:
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1", db_name
            )
            if exists is None:
                await conn.execute(f'CREATE DATABASE "{db_name}"')
                print(f"[setup_db] Created database: {db_name}")
            else:
                print(f"[setup_db] Database already exists: {db_name}")
        finally:
            await conn.close()
    except asyncpg.exceptions.InsufficientPrivilegeError:
        raise RuntimeError(
            f"\n  User '{user}' lacks CREATEDB privilege.\n"
            f"  Create the test database manually before re-running:\n"
            f"    docker compose exec db createdb -U {user} {db_name}\n"
            f"  or via psql:  CREATE DATABASE {db_name} OWNER {user};\n"
        ) from None
    except asyncpg.exceptions.InvalidCatalogNameError:
        print(
            "[setup_db] Cannot reach 'postgres' db. "
            "Assuming test database already exists."
        )


async def _create_tables() -> None:
    from app.core.database import engine
    from app.models import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[setup_db] Tables created.")


async def _seed_users() -> None:
    from sqlalchemy import select

    from app.core.database import async_session
    from app.core.security import hash_password
    from app.models.enums import UserRole
    from app.models.user import User

    async with async_session() as db:
        db_url = str(db.get_bind().url)
        if "helpdesk_test" not in db_url:
            raise RuntimeError(
                f"DATABASE_URL does not contain 'helpdesk_test': {db_url}. "
                "Aborting seed to protect non-test database."
            )

        result = await db.execute(select(User).where(User.email == "admin@test.com"))
        if result.scalar_one_or_none() is None:
            db.add(
                User(
                    email="admin@test.com",
                    name="Test Admin",
                    password_hash=hash_password("AdminPass123!"),
                    role=UserRole.ADMIN,
                )
            )
            print("[setup_db] Seeded admin user: admin@test.com / AdminPass123!")

        result = await db.execute(select(User).where(User.email == "agent@test.com"))
        if result.scalar_one_or_none() is None:
            db.add(
                User(
                    email="agent@test.com",
                    name="Test Agent",
                    password_hash=hash_password("AgentPass123!"),
                    role=UserRole.AGENT,
                )
            )
            print("[setup_db] Seeded agent user: agent@test.com / AgentPass123!")

        result = await db.execute(select(User).where(User.email == "ai@helpdesk.com"))
        if result.scalar_one_or_none() is None:
            db.add(
                User(
                    email="ai@helpdesk.com",
                    name="AI Assistant",
                    password_hash=hash_password("AIAgent_Secret123!"),
                    role=UserRole.AGENT,
                )
            )
            print("[setup_db] Seeded AI agent: ai@helpdesk.com")

        await db.commit()


async def main() -> None:
    await _ensure_test_database()
    await _create_tables()
    await _seed_users()


if __name__ == "__main__":
    asyncio.run(main())
