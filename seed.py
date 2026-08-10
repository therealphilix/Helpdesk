import asyncio
import os
import sys

_base = os.path.dirname(os.path.abspath(__file__))
_path = _base if os.path.isdir(os.path.join(_base, "app")) else os.path.join(_base, "backend")
sys.path.insert(0, _path)

from sqlalchemy import select

from app.core.database import async_session
from app.core.security import hash_password
from app.models import User
from app.models.enums import UserRole


async def seed():
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    ai_password = os.getenv("AI_AGENT_PASSWORD")

    if not admin_email or not admin_password:
        print("Warning: ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin creation")
        return

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == admin_email))
        if not result.scalar_one_or_none():
            user = User(
                email=admin_email,
                name="Admin",
                password_hash=hash_password(admin_password),
                role=UserRole.ADMIN,
            )
            db.add(user)
            await db.commit()
            print(f"Admin user created: {admin_email}")
        else:
            print(f"Admin user already exists: {admin_email}")

        result = await db.execute(select(User).where(User.email == "ai@helpdesk.com"))
        if result.scalar_one_or_none():
            print("AI agent already exists: ai@helpdesk.com")
            return

        ai = User(
            email="ai@helpdesk.com",
            name="AI Assistant",
            password_hash=hash_password(ai_password or "ai-agent-password-change-me"),
            role=UserRole.AGENT,
        )
        db.add(ai)
        await db.commit()
        print(f"AI agent created: ai@helpdesk.com")


if __name__ == "__main__":
    asyncio.run(seed())
