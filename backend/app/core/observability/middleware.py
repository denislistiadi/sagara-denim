"""Middleware request context: request ID, log JSON, dan metrik."""

from __future__ import annotations

import logging
import re
from time import perf_counter
from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.observability.context import RequestContext
from app.core.observability.logging import request_id_var
from app.core.observability.metrics import (
    HTTP_IN_FLIGHT,
    observe_request_finished,
    observe_request_started,
)

logger = logging.getLogger("app.http")

_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{8,128}$")
_UNMATCHED_ROUTE = "<unmatched>"


class RequestContextMiddleware:
    """Beri setiap request ID, log akses JSON, dan metrik Prometheus."""

    def __init__(self, app: ASGIApp, *, health_path: str, route_prefix: str = "") -> None:
        self.app = app
        self.health_path = health_path
        self.route_prefix = route_prefix.rstrip("/")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _request_id_from(scope)
        token = request_id_var.set(request_id)
        started = perf_counter()
        status_code = 500
        observe_request_started()

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
            context = _context(
                scope,
                request_id,
                status_code,
                started,
                self.route_prefix,
            )
            logger.exception("request failed", extra=context.as_log_extra())
            _record_metrics(context)
            raise
        else:
            context = _context(
                scope,
                request_id,
                status_code,
                started,
                self.route_prefix,
            )
            logger.log(
                _level_for(scope["path"], self.health_path),
                "request completed",
                extra=context.as_log_extra(),
            )
            _record_metrics(context)
        finally:
            HTTP_IN_FLIGHT.dec()
            request_id_var.reset(token)


def _record_metrics(context: RequestContext) -> None:
    """Catat metrik setelah status dan durasi final diketahui."""

    observe_request_finished(
        method=context.method,
        route=context.route,
        status_code=context.status_code,
        duration_seconds=context.duration_ms / 1000,
    )


def _context(
    scope: Scope,
    request_id: str,
    status_code: int,
    started: float,
    prefix: str,
) -> RequestContext:
    """Bangun context final untuk log dan metrik."""

    return RequestContext(
        request_id=request_id,
        method=scope["method"],
        path=scope["path"],
        route=_route_template(scope, prefix),
        status_code=status_code,
        duration_ms=round((perf_counter() - started) * 1000, 2),
    )


def _route_template(scope: Scope, prefix: str) -> str:
    """Ambil route template Starlette, bukan URL mentah.

    ``route.path`` belum memuat prefix router utama (misalnya ``/api``), jadi
    prefix ditambahkan hanya untuk request yang memang berada di bawah prefix
    tersebut.
    """

    route = scope.get("route")
    path = getattr(route, "path", None)
    if not isinstance(path, str) or not path:
        return _UNMATCHED_ROUTE

    request_path = scope["path"]
    if not prefix:
        return path

    under_prefix = request_path == prefix or request_path.startswith(f"{prefix}/")
    if not under_prefix:
        return path
    if path == "/" or path == prefix or path.startswith(f"{prefix}/"):
        return path
    return f"{prefix}{path}"


def _request_id_from(scope: Scope) -> str:
    """Pakai header request ID yang valid atau buat ID baru."""

    supplied = Headers(scope=scope).get("x-request-id", "").strip()
    if _REQUEST_ID_PATTERN.fullmatch(supplied):
        return supplied
    return uuid4().hex


def _level_for(path: str, health_path: str) -> int:
    """Turunkan level log health check agar tidak membanjiri log."""

    if path == health_path or path.startswith(f"{health_path}/"):
        return logging.DEBUG
    return logging.INFO


# Nama lama tetap tersedia untuk impor yang sudah ada.
RequestLoggingMiddleware = RequestContextMiddleware
