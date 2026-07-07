import secrets
from datetime import datetime, timedelta, timezone

import bcrypt

from .config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def generate_session_token() -> str:
    return secrets.token_urlsafe(48)


def session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
