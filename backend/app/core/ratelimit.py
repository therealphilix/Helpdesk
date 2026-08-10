import time
from typing import Optional

from fastapi import HTTPException, Request, status


def parse_rate_limit(value: str) -> tuple[int, int]:
    parts = value.split("/")
    max_requests = int(parts[0])
    unit = parts[1] if len(parts) > 1 else "minute"
    multipliers = {
        "second": 1,
        "minute": 60,
        "hour": 3600,
        "day": 86400,
    }
    return max_requests, multipliers.get(unit, 60)


class RateLimiter:
    def __init__(
        self,
        key: str = "global",
        max_requests: int = 5,
        window_seconds: int = 60,
    ):
        self._key = key
        self._max_requests = max_requests
        self._window_seconds = window_seconds

    async def __call__(self, request: Request) -> None:
        redis_pool = request.app.state.arq_redis
        if redis_pool is None:
            return

        client_ip = request.client.host if request.client else "unknown"
        redis_key = f"ratelimit:{self._key}:{client_ip}"

        now = time.time()
        window_start = now - self._window_seconds

        await redis_pool.zremrangebyscore(redis_key, 0, window_start)
        count = await redis_pool.zcard(redis_key)

        if count >= self._max_requests:
            oldest = await redis_pool.zrange(redis_key, 0, 0, withscores=True)
            if oldest:
                retry_after = int(oldest[0][1] + self._window_seconds - now) + 1
            else:
                retry_after = self._window_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
                headers={"Retry-After": str(retry_after)},
            )

        await redis_pool.zadd(redis_key, {str(now): now})
        await redis_pool.expire(redis_key, self._window_seconds + 1)
