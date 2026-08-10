import asyncio
import os
from contextlib import asynccontextmanager

from arq import create_pool
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import sentry_sdk
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware
from sqlalchemy import text

from .core.config import settings
from .core.csrf import OriginGuard
from .core.database import engine
from .core.limiter import limiter
from .routers import auth, dashboard, tickets, users, webhooks
from .services.session_cleanup import periodic_session_cleanup

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=1.0 if settings.ENVIRONMENT == "development" else 0.1,
        send_default_pii=False,
        integrations=[SqlalchemyIntegration()],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))

    try:
        arq_redis = await create_pool(settings.arq_redis_settings())
        app.state.arq_redis = arq_redis
    except Exception:
        import logging
        logging.getLogger(__name__).warning("Redis unavailable — classification queue disabled")
        app.state.arq_redis = None

    session_task = asyncio.create_task(periodic_session_cleanup())

    yield

    session_task.cancel()
    try:
        await session_task
    except asyncio.CancelledError:
        pass

    if app.state.arq_redis is not None:
        await app.state.arq_redis.close()


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
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "database": "connected"}


FRONTEND_DIR = os.environ.get("STATIC_DIR", os.path.join(os.path.dirname(__file__), "..", "frontend-dist"))
if os.path.isdir(FRONTEND_DIR):
    assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path) and not full_path.startswith("api"):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
