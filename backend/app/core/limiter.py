from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

_fallback_limits = [settings.LOGIN_RATE_LIMIT] if settings.LOGIN_RATE_LIMIT != "5/minute" else ["5/minute"]

_storage_uri = "memory://" if settings.ENVIRONMENT == "development" else settings.REDIS_URL

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    headers_enabled=True,
    in_memory_fallback_enabled=True,
    in_memory_fallback=_fallback_limits,
    swallow_errors=False,
)
