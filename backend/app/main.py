from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware
from sqlalchemy import text

from .core.config import settings
from .core.csrf import OriginGuard
from .core.database import engine
from .core.limiter import limiter
from .routers import auth
from .services.session_cleanup import cleanup_expired_sessions, periodic_session_cleanup


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    task = asyncio.create_task(periodic_session_cleanup())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)

app.add_middleware(SlowAPIASGIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)

app.add_middleware(OriginGuard)

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.state.limiter = limiter

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "database": "connected"}
