"""Logika bisnis ringkasan dashboard."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.time import WIB
from app.models import (
    Material,
    OrderStatus,
    Priority,
    ProductionLog,
    ProductionOrder,
    ProductionOrderItem,
)
from app.schemas.dashboard import (
    DashboardDailyOutput,
    DashboardDeadline,
    DashboardKpis,
    DashboardPipelineStage,
    DashboardRejectStage,
    DashboardStockItem,
    DashboardSummary,
)
from app.schemas.material import StockStatus
from app.schemas.report import ProductionStage
from app.services.production_orders import model_summary
from app.services.stock import stock_percent, stock_status

DAILY_WINDOW_DAYS = 7
ON_TIME_WINDOW_DAYS = 30
DEADLINE_LIMIT = 5
STOCK_LIMIT = 5

ACTIVE_STATUS_ORDER = (
    OrderStatus.MENUNGGU,
    OrderStatus.CUTTING,
    OrderStatus.JAHIT,
    OrderStatus.FINISHING,
    OrderStatus.QC,
)
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
STOCK_SEVERITY = {
    StockStatus.HABIS: 0,
    StockStatus.KRITIS: 1,
    StockStatus.MENIPIS: 2,
}


def _ratio(output_qty: int, reject_qty: int) -> float:
    """Hitung rasio reject dengan rumus yang sama seperti laporan produksi."""

    total = output_qty + reject_qty
    if total == 0:
        return 0.0

    value = Decimal(reject_qty) * 100 / Decimal(total)
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _wib_date(value: datetime) -> date:
    """Ubah timestamp database menjadi tanggal WIB."""

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(WIB).date()


def _priority_rank():
    """Urutkan prioritas tinggi lebih dahulu pada daftar deadline."""

    return case(
        (ProductionOrder.priority == Priority.TINGGI, 0),
        (ProductionOrder.priority == Priority.NORMAL, 1),
        else_=2,
    )


async def _fetch_order_kpis(session: AsyncSession, *, today: date) -> tuple[int, int]:
    """Ambil jumlah order aktif dan order yang masuk hari ini."""

    start = datetime.combine(today, time.min, tzinfo=WIB)
    end = start + timedelta(days=1)

    row = (
        await session.execute(
            select(
                func.count(ProductionOrder.id).filter(
                    ProductionOrder.status.in_(ACTIVE_STATUS_ORDER)
                ),
                func.count(ProductionOrder.id).filter(
                    ProductionOrder.created_at >= start,
                    ProductionOrder.created_at < end,
                ),
            ).where(ProductionOrder.deleted_at.is_(None))
        )
    ).one()

    return int(row[0] or 0), int(row[1] or 0)


async def _fetch_daily_output(
    session: AsyncSession,
    *,
    start_date: date,
    end_date: date,
) -> tuple[list[DashboardDailyOutput], int, int, int]:
    """Ambil output tujuh hari dan nilai hari ini/kemarin."""

    rows = (
        await session.execute(
            select(
                ProductionLog.log_date,
                func.coalesce(func.sum(ProductionLog.output_qty), 0),
                func.coalesce(func.sum(ProductionLog.reject_qty), 0),
            )
            .join(
                ProductionOrder,
                ProductionLog.production_order_id == ProductionOrder.id,
            )
            .where(
                ProductionLog.log_date >= start_date,
                ProductionLog.log_date <= end_date,
                ProductionOrder.deleted_at.is_(None),
            )
            .group_by(ProductionLog.log_date)
        )
    ).all()

    stats = {
        log_date: (int(output_qty or 0), int(reject_qty or 0))
        for log_date, output_qty, reject_qty in rows
    }

    daily: list[DashboardDailyOutput] = []
    current = start_date
    while current <= end_date:
        daily.append(
            DashboardDailyOutput(
                date=current,
                output_qty=stats.get(current, (0, 0))[0],
            )
        )
        current += timedelta(days=1)

    today_output, today_reject = stats.get(end_date, (0, 0))
    yesterday_output = stats.get(end_date - timedelta(days=1), (0, 0))[0]
    return daily, today_output, yesterday_output, today_reject


async def _fetch_reject_breakdown(
    session: AsyncSession,
    *,
    start_date: date,
    end_date: date,
) -> list[DashboardRejectStage]:
    """Ambil reject per tahap dengan empat tahap tetap."""

    rows = (
        await session.execute(
            select(
                ProductionLog.stage,
                func.coalesce(func.sum(ProductionLog.reject_qty), 0),
            )
            .join(
                ProductionOrder,
                ProductionLog.production_order_id == ProductionOrder.id,
            )
            .where(
                ProductionLog.log_date >= start_date,
                ProductionLog.log_date <= end_date,
                ProductionOrder.deleted_at.is_(None),
            )
            .group_by(ProductionLog.stage)
        )
    ).all()

    stats = {
        stage.value if isinstance(stage, OrderStatus) else str(stage): int(reject_qty or 0)
        for stage, reject_qty in rows
    }

    return [
        DashboardRejectStage(
            stage=stage,
            reject_qty=stats.get(STAGE_TO_STATUS[stage].value, 0),
        )
        for stage in STAGE_ORDER
    ]


async def _fetch_pipeline(session: AsyncSession) -> list[DashboardPipelineStage]:
    """Ambil distribusi order aktif untuk lima status."""

    rows = (
        await session.execute(
            select(
                ProductionOrder.status,
                func.count(ProductionOrder.id),
                func.coalesce(func.sum(ProductionOrder.total_quantity), 0),
            )
            .where(
                ProductionOrder.deleted_at.is_(None),
                ProductionOrder.status.in_(ACTIVE_STATUS_ORDER),
            )
            .group_by(ProductionOrder.status)
        )
    ).all()

    stats = {
        status: (int(order_count or 0), int(total_quantity or 0))
        for status, order_count, total_quantity in rows
    }

    return [
        DashboardPipelineStage(
            status=status,
            order_count=stats.get(status, (0, 0))[0],
            total_quantity=stats.get(status, (0, 0))[1],
        )
        for status in ACTIVE_STATUS_ORDER
    ]


async def _fetch_deadlines(
    session: AsyncSession,
    *,
    today: date,
) -> list[DashboardDeadline]:
    """Ambil maksimal lima deadline terdekat dari order aktif."""

    orders = (
        (
            await session.scalars(
                select(ProductionOrder)
                .options(
                    joinedload(ProductionOrder.customer),
                    selectinload(ProductionOrder.items).joinedload(
                        ProductionOrderItem.product
                    ),
                )
                .where(
                    ProductionOrder.deleted_at.is_(None),
                    ProductionOrder.status.in_(ACTIVE_STATUS_ORDER),
                    ProductionOrder.deadline.is_not(None),
                )
                .order_by(
                    ProductionOrder.deadline.asc(),
                    _priority_rank(),
                    ProductionOrder.code.asc(),
                )
                .limit(DEADLINE_LIMIT)
            )
        )
        .unique()
        .all()
    )

    return [
        DashboardDeadline(
            id=order.id,
            code=order.code,
            model_summary=model_summary(order),
            customer_name=order.customer.name if order.customer else None,
            deadline=order.deadline,
            priority=order.priority,
            status=order.status,
            is_overdue=order.deadline < today,
        )
        for order in orders
        if order.deadline is not None
    ]


async def _fetch_critical_stock(session: AsyncSession) -> list[DashboardStockItem]:
    """Ambil maksimal lima bahan aktif yang berada di bawah batas aman."""

    materials = (
        await session.scalars(
            select(Material).where(
                Material.is_active.is_(True),
                or_(
                    Material.stock_qty <= 0,
                    and_(
                        Material.minimum_stock > 0,
                        Material.stock_qty < Material.minimum_stock,
                    ),
                ),
            )
        )
    ).all()

    sorted_materials = sorted(
        materials,
        key=lambda material: (
            STOCK_SEVERITY[stock_status(material.stock_qty, material.minimum_stock)],
            stock_percent(material.stock_qty, material.minimum_stock),
            material.name,
        ),
    )

    return [
        DashboardStockItem(
            id=material.id,
            sku=material.sku,
            name=material.name,
            category=material.category,
            unit=material.unit,
            stock_qty=material.stock_qty,
            minimum_stock=material.minimum_stock,
            status=stock_status(material.stock_qty, material.minimum_stock),
            percent=stock_percent(material.stock_qty, material.minimum_stock),
        )
        for material in sorted_materials[:STOCK_LIMIT]
    ]


async def _fetch_on_time_delivery(
    session: AsyncSession,
    *,
    today: date,
) -> tuple[float | None, int, int]:
    """Hitung persentase order selesai tepat waktu dalam 30 hari kalender."""

    start_date = today - timedelta(days=ON_TIME_WINDOW_DAYS - 1)
    rows = (
        await session.execute(
            select(ProductionOrder.deadline, ProductionOrder.completed_at).where(
                ProductionOrder.status == OrderStatus.SELESAI,
                ProductionOrder.deleted_at.is_(None),
                ProductionOrder.deadline.is_not(None),
                ProductionOrder.completed_at.is_not(None),
            )
        )
    ).all()

    completed = 0
    on_time = 0
    for deadline, completed_at in rows:
        if deadline is None or completed_at is None:
            continue
        completed_date = _wib_date(completed_at)
        if completed_date < start_date or completed_date > today:
            continue
        completed += 1
        if completed_date <= deadline:
            on_time += 1

    ratio = round(on_time * 100 / completed, 2) if completed else None
    return ratio, completed, on_time


async def build_dashboard(
    session: AsyncSession,
    *,
    now: datetime | None = None,
) -> DashboardSummary:
    """Bangun seluruh data dashboard untuk satu request."""

    current = now or datetime.now(UTC)
    if current.tzinfo is None:
        current = current.replace(tzinfo=UTC)

    today = current.astimezone(WIB).date()
    start_date = today - timedelta(days=DAILY_WINDOW_DAYS - 1)

    active_orders, new_orders_today = await _fetch_order_kpis(session, today=today)
    daily_output, today_output, yesterday_output, today_reject = (
        await _fetch_daily_output(
            session,
            start_date=start_date,
            end_date=today,
        )
    )
    reject_breakdown = await _fetch_reject_breakdown(
        session,
        start_date=start_date,
        end_date=today,
    )
    pipeline = await _fetch_pipeline(session)
    deadlines = await _fetch_deadlines(session, today=today)
    critical_stock = await _fetch_critical_stock(session)
    on_time_ratio, completed_orders, on_time_orders = await _fetch_on_time_delivery(
        session,
        today=today,
    )

    return DashboardSummary(
        business_date=today,
        generated_at=current.astimezone(WIB),
        kpis=DashboardKpis(
            active_orders=active_orders,
            new_orders_today=new_orders_today,
            today_output=today_output,
            yesterday_output=yesterday_output,
            today_reject=today_reject,
            today_reject_ratio=_ratio(today_output, today_reject),
            on_time_delivery_ratio=on_time_ratio,
            completed_orders_30d=completed_orders,
            on_time_orders_30d=on_time_orders,
        ),
        daily_output=daily_output,
        reject_breakdown=reject_breakdown,
        pipeline=pipeline,
        upcoming_deadlines=deadlines,
        critical_stock=critical_stock,
    )
