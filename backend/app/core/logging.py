"""Logging JSON dan pemantauan query lambat."""

from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from datetime import UTC, datetime
from time import perf_counter
from typing import Any
from weakref import WeakKeyDictionary

from sqlalchemy import Engine, event
from sqlalchemy.engine import ExecutionContext

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

APP_LOGGER_NAME = "app"
SLOW_QUERY_LOGGER = logging.getLogger("app.db")
_EXTRA_FIELDS = (
    "request_id",
    "method",
    "path",
    "status_code",
    "duration_ms",
    "query_ms",
    "statement",
)


class JsonFormatter(logging.Formatter):
    """Format satu record log sebagai satu baris JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in _EXTRA_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(level: str = "INFO") -> None:
    """Pasang handler JSON secara idempoten pada logger aplikasi."""

    logger = logging.getLogger(APP_LOGGER_NAME)
    logger.setLevel(level.upper())
    logger.propagate = False

    has_json_handler = any(
        isinstance(handler.formatter, JsonFormatter) for handler in logger.handlers
    )
    if not has_json_handler:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)


def install_slow_query_logging(engine: Engine, threshold_ms: float) -> None:
    """Catat query yang berjalan lebih lama dari ambang yang ditentukan."""

    if threshold_ms <= 0:
        return

    query_started: WeakKeyDictionary[ExecutionContext, float] = WeakKeyDictionary()

    @event.listens_for(engine, "before_cursor_execute")
    def _before_cursor_execute(
        _conn: Any,
        _cursor: Any,
        _statement: str,
        _parameters: Any,
        context: ExecutionContext,
        _executemany: bool,
    ) -> None:
        query_started[context] = perf_counter()

    @event.listens_for(engine, "after_cursor_execute")
    def _after_cursor_execute(
        _conn: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        context: ExecutionContext,
        _executemany: bool,
    ) -> None:
        started = query_started.pop(context, None)
        if started is None:
            return

        duration_ms = (perf_counter() - started) * 1000
        if duration_ms < threshold_ms:
            return

        SLOW_QUERY_LOGGER.warning(
            "slow query",
            extra={
                "request_id": request_id_var.get(),
                "query_ms": round(duration_ms, 2),
                "statement": " ".join(statement.split())[:500],
            },
        )
