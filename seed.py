import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy import select

from backend.app.core.database import async_session
from backend.app.core.security import hash_password
from backend.app.models import User
from backend.app.models.enums import UserRole


async def seed():
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        print("Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set.")
        sys.exit(1)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == admin_email))
        if result.scalar_one_or_none():
            print(f"Admin user already exists: {admin_email}")
            return

        user = User(
            email=admin_email,
            name="Admin",
            password_hash=hash_password(admin_password),
            role=UserRole.ADMIN,
        )
        db.add(user)
        await db.commit()
        print(f"Admin user created: {admin_email}")


if __name__ == "__main__":
    asyncio.run(seed())
