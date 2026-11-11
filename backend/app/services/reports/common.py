"""Helper bersama untuk kueri dan export laporan produksi."""

from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy.orm import joinedload

from app.models import OrderStatus, ProductionLog, ProductionOrder
from app.schemas.report import ProductionStage
from app.services.reports.constants import STAGE_TO_STATUS


def _percentage(part: int, total: int) -> float:
    """Hitung persentase dengan pembulatan dua desimal."""

    if total == 0:
        return 0.0

    value = Decimal(part) * 100 / Decimal(total)
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def ratio(output_qty: int, reject_qty: int, scrap_qty: int) -> float:
    """Hitung rasio reject terhadap seluruh kuantitas yang dicatat."""

    return _percentage(reject_qty, output_qty + reject_qty + scrap_qty)


def scrap_ratio(output_qty: int, reject_qty: int, scrap_qty: int) -> float:
    """Hitung rasio scrap terhadap seluruh kuantitas yang dicatat."""

    return _percentage(scrap_qty, output_qty + reject_qty + scrap_qty)


def stage_from_db(value: OrderStatus | str) -> ProductionStage:
    """Ubah nilai enum database menjadi tahap laporan."""

    stage_value = value.value if isinstance(value, OrderStatus) else value
    return ProductionStage(stage_value)


def base_conditions(
    start_date: date,
    end_date: date,
    stage: ProductionStage | None,
    order_id: UUID | None,
) -> list:
    """Bangun kondisi filter log produksi."""

    conditions = [
        ProductionLog.log_date >= start_date,
        ProductionLog.log_date <= end_date,
    ]

    if stage is not None:
        conditions.append(ProductionLog.stage == STAGE_TO_STATUS[stage])

    if order_id is not None:
        conditions.append(ProductionLog.production_order_id == order_id)

    return conditions


def log_options() -> tuple:
    """Opsi eager loading agar tidak ada lazy load di sesi async."""

    return (
        joinedload(ProductionLog.order).joinedload(ProductionOrder.customer),
        joinedload(ProductionLog.created_by),
    )


def log_order_by() -> tuple:
    """Urutan tabel log yang stabil."""

    return (
        ProductionLog.log_date.desc(),
        ProductionLog.created_at.desc(),
        ProductionLog.id.desc(),
    )
