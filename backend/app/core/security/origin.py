"""Pemeriksaan origin untuk request yang mengubah state."""

from __future__ import annotations

from collections.abc import Iterable

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
_DETAIL = "Origin permintaan tidak diizinkan."


class OriginCheckMiddleware:
    """Tolak request tidak aman dari origin yang tidak dikenal.

    Browser modern mengirim header ``Origin`` pada request POST/PUT/PATCH/DELETE.
    Request tanpa ``Origin`` (health check internal, CLI, Prometheus) tetap
    diizinkan karena bukan jalur browser.
    """

    def __init__(self, app: ASGIApp, *, allowed_origins: Iterable[str]) -> None:
        self.app = app
        self.allowed_origins = {origin.rstrip("/") for origin in allowed_origins if origin}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"].upper() in _SAFE_METHODS:
            await self.app(scope, receive, send)
            return

        origin = Headers(scope=scope).get("origin")
        if origin is not None and origin.rstrip("/") not in self.allowed_origins:
            response = JSONResponse(status_code=403, content={"detail": _DETAIL})
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
