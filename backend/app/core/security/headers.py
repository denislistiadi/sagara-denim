"""Header keamanan untuk respons API."""

from __future__ import annotations

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"


class SecurityHeadersMiddleware:
    """Tambahkan header keamanan pada setiap respons HTTP."""

    def __init__(self, app: ASGIApp, *, production: bool) -> None:
        self.app = app
        self.production = production

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                _set_if_missing(headers, "X-Content-Type-Options", "nosniff")
                _set_if_missing(headers, "X-Frame-Options", "DENY")
                _set_if_missing(headers, "Referrer-Policy", "strict-origin-when-cross-origin")
                _set_if_missing(
                    headers,
                    "Permissions-Policy",
                    "camera=(), microphone=(), geolocation=()",
                )
                if self.production:
                    _set_if_missing(
                        headers,
                        "Strict-Transport-Security",
                        "max-age=31536000; includeSubDomains",
                    )
                    _set_if_missing(headers, "Content-Security-Policy", _API_CSP)
            await send(message)

        await self.app(scope, receive, send_with_headers)


def _set_if_missing(headers: MutableHeaders, name: str, value: str) -> None:
    """Hormati header yang sudah ditetapkan Caddy atau handler."""

    if name not in headers:
        headers[name] = value
