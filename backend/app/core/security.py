import secrets
from datetime import datetime, timedelta, timezone

import bcrypt

from .config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


DUMMY_PASSWORD_HASH = hash_password("__dummy__")


def timing_safe_dummy_verify(password: str) -> None:
    verify_password(password, DUMMY_PASSWORD_HASH)


def generate_session_token() -> str:
    return secrets.token_urlsafe(48)


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
