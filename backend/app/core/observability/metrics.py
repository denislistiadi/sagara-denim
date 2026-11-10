"""Instrumen Prometheus untuk aplikasi Sagara Denim.

Semua label dibatasi agar cardinality tidak tumbuh mengikuti data pengguna.
Route yang tidak dikenal dipetakan ke ``<unmatched>`` oleh middleware.
"""

from __future__ import annotations

from typing import Any

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

HTTP_REQUESTS = Counter(
    "sagara_http_requests_total",
    "Jumlah request HTTP berdasarkan method, route template, dan status.",
    ("method", "route", "status"),
)
HTTP_DURATION = Histogram(
    "sagara_http_request_duration_seconds",
    "Durasi request HTTP dalam detik.",
    ("method", "route"),
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)
HTTP_IN_FLIGHT = Gauge(
    "sagara_http_requests_in_flight",
    "Jumlah request HTTP yang sedang diproses.",
)
DB_POOL = Gauge(
    "sagara_db_pool_connections",
    "Jumlah koneksi pool database berdasarkan state.",
    ("state",),
)
LOGIN_FAILURES = Counter(
    "sagara_login_failures_total",
    "Jumlah kegagalan login berdasarkan scope pembatas.",
    ("scope",),
)
LOGIN_BLOCKED = Counter(
    "sagara_login_blocked_total",
    "Jumlah request login yang ditolak karena blokir rate limit.",
    ("scope",),
)


def observe_request_started() -> None:
    """Naikkan gauge request yang sedang berjalan."""

    HTTP_IN_FLIGHT.inc()


def observe_request_finished(
    *,
    method: str,
    route: str,
    status_code: int,
    duration_seconds: float,
) -> None:
    """Catat satu request selesai ke counter dan histogram."""

    HTTP_REQUESTS.labels(
        method=method,
        route=route,
        status=str(status_code),
    ).inc()
    HTTP_DURATION.labels(method=method, route=route).observe(duration_seconds)


def observe_login_failure(scope: str) -> None:
    """Catat kegagalan login pada scope email atau ip."""

    LOGIN_FAILURES.labels(scope=scope).inc()


def observe_login_blocked(scope: str) -> None:
    """Catat request yang ditolak karena blokir aktif."""

    LOGIN_BLOCKED.labels(scope=scope).inc()


def bind_db_pool(pool: Any) -> None:
    """Hubungkan gauge pool ke statistik SQLAlchemy saat scrape."""

    DB_POOL.labels(state="checked_in").set_function(pool.checkedin)
    DB_POOL.labels(state="checked_out").set_function(pool.checkedout)
    DB_POOL.labels(state="overflow").set_function(pool.overflow)
    DB_POOL.labels(state="size").set_function(pool.size)


def render_metrics() -> bytes:
    """Hasilkan payload teks Prometheus."""

    return generate_latest()


def metrics_content_type() -> str:
    """Kembalikan content type resmi Prometheus."""

    return CONTENT_TYPE_LATEST
