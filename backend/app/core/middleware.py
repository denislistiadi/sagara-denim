"""Middleware request ID dan log akses JSON."""

from __future__ import annotations

import logging
import re
from time import perf_counter
from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import request_id_var

logger = logging.getLogger("app.http")

_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{8,128}$")


class RequestLoggingMiddleware:
    """Beri setiap request ID dan catat hasilnya sebagai JSON."""

    def __init__(self, app: ASGIApp, *, health_path: str) -> None:
        self.app = app
        self.health_path = health_path

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _request_id_from(scope)
        token = request_id_var.set(request_id)
        started = perf_counter()
        status_code = 500

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = MutableHeaders(scope=message)
                headers["X-Request-ID"] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            logger.exception(
                "request failed",
                extra={
                    "request_id": request_id,
                    "method": scope["method"],
                    "path": scope["path"],
                    "status_code": status_code,
                    "duration_ms": _elapsed_ms(started),
                },
            )
            raise
        else:
            logger.log(
                _level_for(scope["path"], self.health_path),
                "request completed",
                extra={
                    "request_id": request_id,
                    "method": scope["method"],
                    "path": scope["path"],
                    "status_code": status_code,
                    "duration_ms": _elapsed_ms(started),
                },
            )
        finally:
            request_id_var.reset(token)


def _request_id_from(scope: Scope) -> str:
    """Pakai header request ID yang valid atau buat ID baru."""

    supplied = Headers(scope=scope).get("x-request-id", "").strip()
    if _REQUEST_ID_PATTERN.fullmatch(supplied):
        return supplied
    return uuid4().hex


def _level_for(path: str, health_path: str) -> int:
    """Turunkan level log health check agar tidak membanjiri log."""

    return logging.DEBUG if path == health_path else logging.INFO


def _elapsed_ms(started: float) -> float:
    return round((perf_counter() - started) * 1000, 2)
