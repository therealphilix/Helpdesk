from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.csrf import CsrfProtect
from ..core.database import get_db
from ..core.dependencies import get_current_admin, get_current_user
from ..core.limiter import limiter
from ..core.security import (
    generate_csrf_token,
    generate_session_token,
    hash_password,
    session_expiry,
    timing_safe_dummy_verify,
    verify_password,
)
from ..models import Session, User
from ..schemas import LoginRequest, LoginResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        timing_safe_dummy_verify(body.password)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")

    token = generate_session_token()
    csrf_token = generate_csrf_token()
    session = Session(user_id=user.id, token=token, expires_at=session_expiry())
    db.add(session)
    await db.commit()

    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
    )
    return LoginResponse(user=UserOut.model_validate(user), csrf_token=csrf_token)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _csrf: None = Depends(CsrfProtect()),
    user: User = Depends(get_current_user),
):
    session_token = request.cookies.get("session")
    if session_token:
        result = await db.execute(select(Session).where(Session.token == session_token))
        session_row = result.scalar_one_or_none()
        if session_row:
            await db.delete(session_row)
            await db.commit()

    response.delete_cookie("session")
    response.delete_cookie("csrf_token")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(
    user: User = Depends(get_current_admin)):
    return user
