"""Pengujian logging, request ID, kompresi, dan query lambat."""

from __future__ import annotations

import json
import logging
import sys
from collections.abc import Iterator

import pytest
from httpx import AsyncClient
from sqlalchemy import create_engine, text

from app.config import get_settings
from app.core.logging import (
    JsonFormatter,
    configure_logging,
    install_slow_query_logging,
    request_id_var,
)


class ListHandler(logging.Handler):
    """Handler yang menyimpan record untuk diperiksa pengujian."""

    def __init__(self) -> None:
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


@pytest.fixture
def http_logs() -> Iterator[list[logging.LogRecord]]:
    logger = logging.getLogger("app.http")
    handler = ListHandler()
    previous_level = logger.level
    logger.setLevel(logging.DEBUG)
    logger.addHandler(handler)
    try:
        yield handler.records
    finally:
        logger.removeHandler(handler)
        logger.setLevel(previous_level)


async def test_request_id_is_generated_and_echoed(client: AsyncClient) -> None:
    response = await client.get("/")

    request_id = response.headers["x-request-id"]
    assert len(request_id) == 32
    assert set(request_id) <= set("0123456789abcdef")

    supplied = "client-request-123"
    response = await client.get("/", headers={"X-Request-ID": supplied})
    assert response.headers["x-request-id"] == supplied


async def test_invalid_request_id_is_replaced(client: AsyncClient) -> None:
    response = await client.get("/", headers={"X-Request-ID": "bad id!"})

    assert response.headers["x-request-id"] != "bad id!"
    assert len(response.headers["x-request-id"]) == 32


async def test_request_log_contains_context(
    client: AsyncClient,
    http_logs: list[logging.LogRecord],
) -> None:
    response = await client.get("/")

    record = next(record for record in http_logs if record.getMessage() == "request completed")
    assert record.levelno == logging.INFO
    assert record.request_id == response.headers["x-request-id"]
    assert record.method == "GET"
    assert record.path == "/"
    assert record.status_code == 200
    assert record.duration_ms >= 0


async def test_health_check_logs_at_debug(
    client: AsyncClient,
    http_logs: list[logging.LogRecord],
) -> None:
    response = await client.get("/api/health")

    assert response.status_code == 200
    record = next(record for record in http_logs if record.getMessage() == "request completed")
    assert record.levelno == logging.DEBUG
    assert record.path == "/api/health"


async def test_large_response_is_gzipped(client: AsyncClient) -> None:
    response = await client.get("/openapi.json", headers={"Accept-Encoding": "gzip"})

    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"
    assert response.json()["openapi"]


async def test_small_response_is_not_gzipped(client: AsyncClient) -> None:
    response = await client.get("/", headers={"Accept-Encoding": "gzip"})

    assert response.headers.get("content-encoding") is None


async def test_cors_exposes_request_id(client: AsyncClient) -> None:
    origin = get_settings().cors_origins[0]
    response = await client.get("/", headers={"Origin": origin})

    assert response.headers.get("access-control-expose-headers") == "X-Request-ID"


def test_json_formatter_serializes_extra_fields() -> None:
    record = logging.LogRecord(
        name="app.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="halo %s",
        args=("dunia",),
        exc_info=None,
    )
    record.request_id = "req-123"
    record.duration_ms = 1.5

    payload = json.loads(JsonFormatter().format(record))

    assert payload["message"] == "halo dunia"
    assert payload["level"] == "INFO"
    assert payload["logger"] == "app.test"
    assert payload["request_id"] == "req-123"
    assert payload["duration_ms"] == 1.5
    assert payload["timestamp"].endswith("+00:00")


def test_json_formatter_includes_exception() -> None:
    try:
        raise ValueError("boom")
    except ValueError:
        exc_info = sys.exc_info()

    record = logging.LogRecord(
        name="app.test",
        level=logging.ERROR,
        pathname=__file__,
        lineno=1,
        msg="gagal",
        args=(),
        exc_info=exc_info,
    )

    payload = json.loads(JsonFormatter().format(record))

    assert "ValueError: boom" in payload["exception"]


def test_configure_logging_is_idempotent() -> None:
    logger = logging.getLogger("app")
    configure_logging("INFO")
    handlers = list(logger.handlers)

    configure_logging("DEBUG")

    assert logger.handlers == handlers
    assert logger.level == logging.DEBUG
    configure_logging("INFO")


def test_slow_query_logging_records_duration_and_request_id() -> None:
    engine = create_engine("sqlite://")
    logger = logging.getLogger("app.db")
    handler = ListHandler()
    previous_level = logger.level
    logger.setLevel(logging.WARNING)
    logger.addHandler(handler)
    token = request_id_var.set("req-slow")

    try:
        install_slow_query_logging(engine, 0.001)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    finally:
        request_id_var.reset(token)
        logger.removeHandler(handler)
        logger.setLevel(previous_level)
        engine.dispose()

    record = next(record for record in handler.records if record.getMessage() == "slow query")
    assert record.request_id == "req-slow"
    assert record.query_ms >= 0.001
    assert record.statement == "SELECT 1"
