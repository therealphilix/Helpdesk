from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

_fallback_limits = [settings.LOGIN_RATE_LIMIT] if settings.LOGIN_RATE_LIMIT != "5/minute" else ["5/minute"]

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    headers_enabled=True,
    in_memory_fallback_enabled=True,
    in_memory_fallback=_fallback_limits,
    swallow_errors=False,
)
