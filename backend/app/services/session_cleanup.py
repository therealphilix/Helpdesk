import asyncio
from datetime import datetime, timezone

from sqlalchemy import delete

from ..core.database import async_session
from ..models import Session


async def cleanup_expired_sessions() -> None:
    async with async_session() as db:
        await db.execute(
            delete(Session).where(Session.expires_at < datetime.now(timezone.utc))
        )
        await db.commit()


async def periodic_session_cleanup(interval: int = 3600) -> None:
    while True:
        await asyncio.sleep(interval)
        try:
            await cleanup_expired_sessions()
        except Exception:
            pass
