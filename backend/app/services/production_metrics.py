"""Metrik siklus tahap produksi.

Modul ini hanya memakai relationship yang sudah dimuat. Tidak ada query
database di sini agar dapat dipakai bersama oleh service order dan workflow.
"""

from __future__ import annotations

from datetime import datetime

from app.models import OrderStatus, ProductionLog, ProductionOrder

ACTIVE_STATUSES = frozenset(
    {
        OrderStatus.MENUNGGU,
        OrderStatus.CUTTING,
        OrderStatus.JAHIT,
        OrderStatus.FINISHING,
        OrderStatus.QC,
    }
)
TERMINAL_STATUSES = frozenset({OrderStatus.SELESAI, OrderStatus.DIBATALKAN})
LOGGABLE_STATUSES = frozenset(
    {
        OrderStatus.CUTTING,
        OrderStatus.JAHIT,
        OrderStatus.FINISHING,
        OrderStatus.QC,
    }
)


def current_cycle_started_at(order: ProductionOrder) -> datetime | None:
    """Kembalikan waktu mulai siklus tahap saat ini.

    Siklus dimulai dari history terakhir yang masuk ke status sekarang. Jika
    history tidak tersedia, fallback ke waktu pembuatan order.
    """

    for history in reversed(order.status_history):
        if history.to_status == order.status:
            return history.created_at
    return order.created_at


def current_stage_logs(order: ProductionOrder) -> list[ProductionLog]:
    """Ambil log tahap saat ini yang termasuk siklus berjalan."""

    logs = [log for log in order.production_logs if log.stage == order.status]
    started_at = current_cycle_started_at(order)
    if started_at is None:
        return logs
    return [log for log in logs if log.created_at >= started_at]


def current_stage_totals(order: ProductionOrder) -> tuple[int, int]:
    """Hitung total output dan reject pada siklus tahap saat ini."""

    logs = current_stage_logs(order)
    return (
        sum(log.output_qty for log in logs),
        sum(log.reject_qty for log in logs),
    )


def stage_progress(order: ProductionOrder) -> int:
    """Hitung progress tahap berjalan, bukan progress seluruh order."""

    if order.status == OrderStatus.SELESAI:
        return 100
    if order.status in (OrderStatus.MENUNGGU, OrderStatus.DIBATALKAN):
        return 0
    if order.total_quantity <= 0:
        return 0

    output_qty, _ = current_stage_totals(order)
    return min(100, round(output_qty * 100 / order.total_quantity))
