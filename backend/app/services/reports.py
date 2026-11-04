"""Logika bisnis laporan produksi."""

from __future__ import annotations

import csv
import io
from datetime import UTC, date, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models import OrderStatus, ProductionLog, ProductionOrder
from app.schemas.catalog import CustomerOption
from app.schemas.report import (
    ProductionReportDaily,
    ProductionReportFilters,
    ProductionReportLog,
    ProductionReportLogList,
    ProductionReportResponse,
    ProductionReportStage,
    ProductionReportSummary,
    ProductionStage,
)
from app.schemas.user import UserOption

WIB = timezone(timedelta(hours=7), name="WIB")

STAGE_ORDER = (
    ProductionStage.CUTTING,
    ProductionStage.JAHIT,
    ProductionStage.FINISHING,
    ProductionStage.QC,
)

STAGE_TO_STATUS = {
    ProductionStage.CUTTING: OrderStatus.CUTTING,
    ProductionStage.JAHIT: OrderStatus.JAHIT,
    ProductionStage.FINISHING: OrderStatus.FINISHING,
    ProductionStage.QC: OrderStatus.QC,
}

STAGE_LABELS = {
    ProductionStage.CUTTING: "Cutting",
    ProductionStage.JAHIT: "Jahit",
    ProductionStage.FINISHING: "Finishing",
    ProductionStage.QC: "QC",
}

STATUS_LABELS = {
    OrderStatus.MENUNGGU: "Menunggu",
    OrderStatus.CUTTING: "Cutting",
    OrderStatus.JAHIT: "Jahit",
    OrderStatus.FINISHING: "Finishing",
    OrderStatus.QC: "QC",
    OrderStatus.SELESAI: "Selesai",
    OrderStatus.DIBATALKAN: "Dibatalkan",
}

CSV_HEADER = (
    "Tanggal Log",
    "Kode Order",
    "Pelanggan",
    "Tahap",
    "Output",
    "Reject",
    "Rasio Reject (%)",
    "Status Order",
    "Order Diarsipkan",
    "Catatan",
    "Dicatat Oleh",
    "Waktu Input (WIB)",
)


def _ratio(output_qty: int, reject_qty: int) -> float:
    """Hitung rasio reject terhadap total output dan reject."""

    total = output_qty + reject_qty
    if total == 0:
        return 0.0

    value = Decimal(reject_qty) * 100 / Decimal(total)
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _stage_from_db(value: OrderStatus | str) -> ProductionStage:
    """Ubah nilai enum database menjadi tahap laporan."""

    stage_value = value.value if isinstance(value, OrderStatus) else value
    return ProductionStage(stage_value)


def _base_conditions(
    start_date: date,
    end_date: date,
    stage: ProductionStage | None,
) -> list:
    """Bangun kondisi filter log produksi."""

    conditions = [
        ProductionLog.log_date >= start_date,
        ProductionLog.log_date <= end_date,
    ]

    if stage is not None:
        conditions.append(ProductionLog.stage == STAGE_TO_STATUS[stage])

    return conditions


def _log_options() -> tuple:
    """Opsi eager loading agar tidak ada lazy load di sesi async."""

    return (
        joinedload(ProductionLog.order).joinedload(ProductionOrder.customer),
        joinedload(ProductionLog.created_by),
    )


def _log_order_by() -> tuple:
    """Urutan tabel log yang stabil."""

    return (
        ProductionLog.log_date.desc(),
        ProductionLog.created_at.desc(),
        ProductionLog.id.desc(),
    )


async def _fetch_summary(
    session: AsyncSession,
    conditions: list,
) -> ProductionReportSummary:
    """Ambil agregat ringkasan untuk seluruh rentang filter."""

    row = (
        await session.execute(
            select(
                func.coalesce(func.sum(ProductionLog.output_qty), 0),
                func.coalesce(func.sum(ProductionLog.reject_qty), 0),
                func.count(distinct(ProductionLog.production_order_id)),
                func.count(ProductionLog.id),
                func.count(distinct(ProductionLog.log_date)),
            ).where(*conditions)
        )
    ).one()

    total_output = int(row[0] or 0)
    total_reject = int(row[1] or 0)

    return ProductionReportSummary(
        total_output=total_output,
        total_reject=total_reject,
        reject_ratio=_ratio(total_output, total_reject),
        orders_logged=int(row[2] or 0),
        logs_count=int(row[3] or 0),
        days_count=int(row[4] or 0),
    )


async def _fetch_daily(
    session: AsyncSession,
    conditions: list,
) -> list[ProductionReportDaily]:
    """Ambil ringkasan harian yang hanya berisi tanggal dengan log."""

    rows = (
        await session.execute(
            select(
                ProductionLog.log_date,
                func.coalesce(func.sum(ProductionLog.output_qty), 0),
                func.coalesce(func.sum(ProductionLog.reject_qty), 0),
                func.count(ProductionLog.id),
            )
            .where(*conditions)
            .group_by(ProductionLog.log_date)
            .order_by(ProductionLog.log_date.asc())
        )
    ).all()

    result: list[ProductionReportDaily] = []

    for log_date, output_qty, reject_qty, logs_count in rows:
        output_value = int(output_qty or 0)
        reject_value = int(reject_qty or 0)
        result.append(
            ProductionReportDaily(
                date=log_date,
                output_qty=output_value,
                reject_qty=reject_value,
                reject_ratio=_ratio(output_value, reject_value),
                logs_count=int(logs_count or 0),
            )
        )

    return result


async def _fetch_stages(
    session: AsyncSession,
    conditions: list,
) -> list[ProductionReportStage]:
    """Ambil ringkasan per tahap dengan empat tahap tetap."""

    rows = (
        await session.execute(
            select(
                ProductionLog.stage,
                func.coalesce(func.sum(ProductionLog.output_qty), 0),
                func.coalesce(func.sum(ProductionLog.reject_qty), 0),
                func.count(ProductionLog.id),
            )
            .where(*conditions)
            .group_by(ProductionLog.stage)
        )
    ).all()

    stats = {
        _stage_from_db(stage): (
            int(output_qty or 0),
            int(reject_qty or 0),
            int(logs_count or 0),
        )
        for stage, output_qty, reject_qty, logs_count in rows
    }

    result: list[ProductionReportStage] = []

    for stage in STAGE_ORDER:
        output_qty, reject_qty, logs_count = stats.get(stage, (0, 0, 0))
        result.append(
            ProductionReportStage(
                stage=stage,
                output_qty=output_qty,
                reject_qty=reject_qty,
                reject_ratio=_ratio(output_qty, reject_qty),
                logs_count=logs_count,
            )
        )

    return result


async def _fetch_logs(
    session: AsyncSession,
    conditions: list,
    *,
    page: int,
    page_size: int,
) -> tuple[list[ProductionLog], int]:
    """Ambil satu halaman log beserta total baris."""

    total = (
        await session.scalar(
            select(func.count(ProductionLog.id)).where(*conditions)
        )
        or 0
    )

    logs = (
        (
            await session.scalars(
                select(ProductionLog)
                .options(*_log_options())
                .where(*conditions)
                .order_by(*_log_order_by())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .unique()
        .all()
    )

    return list(logs), int(total)


def _to_log_item(log: ProductionLog) -> ProductionReportLog:
    """Petakan model ORM ke schema baris laporan."""

    order = log.order

    return ProductionReportLog(
        id=log.id,
        order_id=order.id,
        order_code=order.code,
        customer=(
            CustomerOption.model_validate(order.customer) if order.customer else None
        ),
        stage=_stage_from_db(log.stage),
        log_date=log.log_date,
        output_qty=log.output_qty,
        reject_qty=log.reject_qty,
        reject_ratio=_ratio(log.output_qty, log.reject_qty),
        notes=log.notes,
        created_by=(
            UserOption.model_validate(log.created_by) if log.created_by else None
        ),
        created_at=log.created_at,
        order_status=order.status,
        order_archived=order.deleted_at is not None,
    )


async def build_production_report(
    session: AsyncSession,
    *,
    start_date: date,
    end_date: date,
    stage: ProductionStage | None,
    page: int,
    page_size: int,
) -> ProductionReportResponse:
    """Bangun laporan produksi lengkap untuk satu request."""

    conditions = _base_conditions(start_date, end_date, stage)
    summary = await _fetch_summary(session, conditions)
    daily = await _fetch_daily(session, conditions)
    stages = await _fetch_stages(session, conditions)
    logs, total = await _fetch_logs(
        session,
        conditions,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0

    return ProductionReportResponse(
        filters=ProductionReportFilters(
            start_date=start_date,
            end_date=end_date,
            stage=stage,
        ),
        summary=summary,
        daily=daily,
        stages=stages,
        logs=ProductionReportLogList(
            items=[_to_log_item(log) for log in logs],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
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
        _csv_text(STAGE_LABELS[_stage_from_db(log.stage)]),
        log.output_qty,
        log.reject_qty,
        _format_ratio_csv(_ratio(log.output_qty, log.reject_qty)),
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
) -> tuple[str, str]:
    """Bangun isi CSV dan nama file untuk seluruh baris hasil filter."""

    conditions = _base_conditions(start_date, end_date, stage)
    logs = (
        (
            await session.scalars(
                select(ProductionLog)
                .options(*_log_options())
                .where(*conditions)
                .order_by(*_log_order_by())
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
