from fastapi import HTTPException, Request, status
from starlette.datastructures import MutableHeaders

from .config import settings


class CsrfProtect:
    async def __call__(self, request: Request) -> None:
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return

        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("x-csrf-token")

        if not csrf_cookie or not csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing",
            )

        if csrf_cookie != csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token mismatch",
            )


class OriginGuard:
    def __init__(self, app):
        self.app = app
        self._allowed = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope["method"] not in ("POST", "PUT", "PATCH", "DELETE"):
            await self.app(scope, receive, send)
            return

        headers = MutableHeaders(scope=scope)
        origin = headers.get("origin")
        referer = headers.get("referer")

        source = origin or referer
        if source:
            allowed = any(source.startswith(o) for o in self._allowed)
            if not allowed:
                from starlette.responses import Response

                response = Response(status_code=403, content="Invalid origin")
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)
