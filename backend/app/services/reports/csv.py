"""Export CSV untuk laporan produksi."""

from __future__ import annotations

import csv
import io
from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import WIB
from app.models import ProductionLog
from app.schemas.report import ProductionStage
from app.services.reports.common import (
    base_conditions,
    log_options,
    log_order_by,
    ratio,
    scrap_ratio,
    stage_from_db,
)
from app.services.reports.constants import (
    CSV_HEADER,
    STAGE_LABELS,
    STATUS_LABELS,
)


def _csv_text(value: str | None) -> str:
    """Amankan nilai teks dari formula injection saat dibuka di spreadsheet."""

    text = value or ""
    if text.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{text}"
    return text


def _format_ratio_csv(value: float) -> str:
    """Format rasio dengan koma desimal untuk Excel Indonesia."""

    return f"{value:.2f}".replace(".", ",")


def _format_wib(value: datetime) -> str:
    """Format timestamp database ke WIB."""

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(WIB).strftime("%Y-%m-%d %H:%M:%S")


def _filename(
    start_date: date,
    end_date: date,
    stage: ProductionStage | None,
) -> str:
    """Bangun nama file CSV yang aman dan deterministik."""

    suffix = f"-{stage.value}" if stage is not None else ""
    return (
        f"laporan-produksi-{start_date.isoformat()}_"
        f"{end_date.isoformat()}{suffix}.csv"
    )


def _csv_row(log: ProductionLog) -> list:
    """Bangun satu baris CSV dari log produksi."""

    order = log.order

    return [
        log.log_date.isoformat(),
        _csv_text(order.code),
        _csv_text(order.customer.name if order.customer else "-"),
        _csv_text(STAGE_LABELS[stage_from_db(log.stage)]),
        log.output_qty,
        log.reject_qty,
        log.scrap_qty,
        _format_ratio_csv(ratio(log.output_qty, log.reject_qty, log.scrap_qty)),
        _format_ratio_csv(
            scrap_ratio(log.output_qty, log.reject_qty, log.scrap_qty)
        ),
        _csv_text(STATUS_LABELS[order.status]),
        "Ya" if order.deleted_at is not None else "Tidak",
        _csv_text(log.notes),
        _csv_text(log.created_by.name if log.created_by else "-"),
        _format_wib(log.created_at),
    ]


async def build_production_report_csv(
    session: AsyncSession,
    *,
    start_date: date,
    end_date: date,
    stage: ProductionStage | None,
    order_id: UUID | None,
) -> tuple[str, str]:
    """Bangun isi CSV dan nama file untuk seluruh baris hasil filter."""

    conditions = base_conditions(start_date, end_date, stage, order_id)
    logs = (
        (
            await session.scalars(
                select(ProductionLog)
                .options(*log_options())
                .where(*conditions)
                .order_by(*log_order_by())
            )
        )
        .unique()
        .all()
    )

    buffer = io.StringIO(newline="")
    buffer.write("\ufeff")

    writer = csv.writer(
        buffer,
        delimiter=";",
        lineterminator="\r\n",
        quoting=csv.QUOTE_MINIMAL,
    )
    writer.writerow(CSV_HEADER)

    for log in logs:
        writer.writerow(_csv_row(log))

    return buffer.getvalue(), _filename(start_date, end_date, stage)
