"""Kueri agregat dan daftar untuk laporan produksi."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ProductionLog
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
from app.services.reports.common import (
    base_conditions,
    log_options,
    log_order_by,
    ratio,
    stage_from_db,
)
from app.services.reports.constants import STAGE_ORDER


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
        reject_ratio=ratio(total_output, total_reject),
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
                reject_ratio=ratio(output_value, reject_value),
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
        stage_from_db(stage): (
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
                reject_ratio=ratio(output_qty, reject_qty),
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
                .options(*log_options())
                .where(*conditions)
                .order_by(*log_order_by())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .unique()
        .all()
    )

    return list(logs), int(total)


def to_log_item(log: ProductionLog) -> ProductionReportLog:
    """Petakan model ORM ke schema baris laporan."""

    order = log.order

    return ProductionReportLog(
        id=log.id,
        order_id=order.id,
        order_code=order.code,
        customer=(
            CustomerOption.model_validate(order.customer) if order.customer else None
        ),
        stage=stage_from_db(log.stage),
        log_date=log.log_date,
        output_qty=log.output_qty,
        reject_qty=log.reject_qty,
        reject_ratio=ratio(log.output_qty, log.reject_qty),
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
    order_id: UUID | None,
    page: int,
    page_size: int,
) -> ProductionReportResponse:
    """Bangun laporan produksi lengkap untuk satu request."""

    conditions = base_conditions(start_date, end_date, stage, order_id)
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
            order_id=order_id,
        ),
        summary=summary,
        daily=daily,
        stages=stages,
        logs=ProductionReportLogList(
            items=[to_log_item(log) for log in logs],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )
