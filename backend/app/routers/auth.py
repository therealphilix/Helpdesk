from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import get_current_admin, get_current_user
from ..core.security import generate_session_token, hash_password, session_expiry, verify_password
from ..models import Session, User
from ..schemas import LoginRequest, UserOut

router = APIRouter()


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")

    token = generate_session_token()
    session = Session(user_id=user.id, token=token, expires_at=session_expiry())
    db.add(session)
    await db.commit()

    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
    )
    return {"ok": True}


@router.post("/logout")
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Session).where(Session.user_id == user.id))
    for s in result.scalars().all():
        await db.delete(s)
    await db.commit()

    response.delete_cookie("session")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
