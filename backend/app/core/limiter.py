from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    headers_enabled=True,
    in_memory_fallback_enabled=True,
    in_memory_fallback=["5/minute"],
    swallow_errors=False,
)
