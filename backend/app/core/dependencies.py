from datetime import datetime, timezone

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.database import get_db
from ..models import Session, User
from ..models.enums import UserRole


async def get_current_user(
    session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    result = await db.execute(
        select(Session)
        .options(joinedload(Session.user))
        .where(Session.token == session)
    )
    session_row = result.scalar_one_or_none()

    if not session_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    if session_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    return session_row.user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
