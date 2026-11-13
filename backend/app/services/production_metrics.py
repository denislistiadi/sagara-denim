"""Metrik siklus tahap produksi.

Modul ini hanya memakai relationship yang sudah dimuat. Tidak ada query
database di sini agar dapat dipakai bersama oleh service order dan workflow.

Aturan kuantitas:

- Input tahap pertama adalah total kuantitas order.
- Transisi normal hanya meneruskan output tahap sebelumnya.
- Rework dari QC memakai reject QC sebagai input tahap tujuan.
- Sebelum keluar tahap, ``output + reject + scrap = input``.
- Hanya QC yang boleh mencatat reject; scrap berlaku di semua tahap.
"""

from __future__ import annotations

from dataclasses import dataclass
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
REWORK_TARGETS = frozenset({OrderStatus.JAHIT, OrderStatus.FINISHING})


@dataclass(frozen=True)
class StageAccounting:
    """Akuntansi kuantitas pada siklus tahap yang sedang berjalan."""

    input_qty: int
    output_qty: int
    reject_qty: int
    scrap_qty: int

    @property
    def accounted_qty(self) -> int:
        """Total kuantitas yang sudah dipertanggungjawabkan pada tahap."""

        return self.output_qty + self.reject_qty + self.scrap_qty

    @property
    def remaining_qty(self) -> int:
        """Sisa input tahap yang belum dicatat."""

        return max(0, self.input_qty - self.accounted_qty)

    @property
    def has_log(self) -> bool:
        """Apakah siklus tahap sudah memiliki log."""

        return self.accounted_qty > 0

    @property
    def is_complete(self) -> bool:
        """Apakah seluruh input tahap sudah terakuntansi."""

        return self.input_qty > 0 and self.accounted_qty == self.input_qty

    @property
    def progress(self) -> int:
        """Progress tahap berdasarkan output dibanding input tahap."""

        if self.input_qty <= 0:
            return 0
        return min(100, round(self.output_qty * 100 / self.input_qty))


def current_cycle_started_at(order: ProductionOrder) -> datetime | None:
    """Kembalikan waktu mulai siklus tahap saat ini.

    Siklus dimulai dari history terakhir yang masuk ke status sekarang. Jika
    history tidak tersedia, fallback ke waktu pembuatan order.
    """

    for history in reversed(order.status_history):
        if history.to_status == order.status:
            return history.created_at
    return order.created_at


def _last_history_to(
    order: ProductionOrder,
    status: OrderStatus,
    *,
    before: datetime | None = None,
):
    """Ambil history terakhir yang masuk ke status tertentu."""

    for history in reversed(order.status_history):
        if history.to_status != status:
            continue
        if before is not None and history.created_at >= before:
            continue
        return history
    return None


def _cycle_logs(
    order: ProductionOrder,
    status: OrderStatus,
    *,
    started_at: datetime | None,
    ended_at: datetime | None = None,
) -> list[ProductionLog]:
    """Ambil log satu tahap pada rentang siklus tertentu."""

    logs: list[ProductionLog] = []
    for log in order.production_logs:
        if log.stage != status:
            continue
        if started_at is not None and log.created_at < started_at:
            continue
        if ended_at is not None and log.created_at >= ended_at:
            continue
        logs.append(log)
    return logs


def current_stage_logs(order: ProductionOrder) -> list[ProductionLog]:
    """Ambil log tahap saat ini yang termasuk siklus berjalan."""

    started_at = current_cycle_started_at(order)
    return _cycle_logs(order, order.status, started_at=started_at)


def current_stage_input(order: ProductionOrder) -> int:
    """Hitung input siklus tahap saat ini sesuai asal transisinya."""

    if order.status not in LOGGABLE_STATUSES:
        return 0

    entry = _last_history_to(order, order.status)
    if entry is None or entry.from_status in (None, OrderStatus.MENUNGGU):
        # Tahap pertama selalu memakai total kuantitas order.
        return order.total_quantity

    if (
        order.status in REWORK_TARGETS
        and entry.from_status == OrderStatus.QC
    ):
        qc_entry = _last_history_to(
            order,
            OrderStatus.QC,
            before=entry.created_at,
        )
        qc_logs = _cycle_logs(
            order,
            OrderStatus.QC,
            started_at=qc_entry.created_at if qc_entry else order.created_at,
            ended_at=entry.created_at,
        )
        return sum(log.reject_qty for log in qc_logs)

    source_entry = _last_history_to(
        order,
        entry.from_status,
        before=entry.created_at,
    )
    if source_entry is None:
        # Fallback untuk data lama tanpa history sumber yang lengkap.
        return order.total_quantity

    source_logs = _cycle_logs(
        order,
        entry.from_status,
        started_at=source_entry.created_at,
        ended_at=entry.created_at,
    )
    return sum(log.output_qty for log in source_logs)


def current_stage_totals(order: ProductionOrder) -> tuple[int, int, int]:
    """Hitung total output, reject, dan scrap pada siklus tahap saat ini."""

    logs = current_stage_logs(order)
    return (
        sum(log.output_qty for log in logs),
        sum(log.reject_qty for log in logs),
        sum(log.scrap_qty for log in logs),
    )


def current_stage_accounting(order: ProductionOrder) -> StageAccounting:
    """Hitung akuntansi lengkap siklus tahap saat ini."""

    output_qty, reject_qty, scrap_qty = current_stage_totals(order)
    return StageAccounting(
        input_qty=current_stage_input(order),
        output_qty=output_qty,
        reject_qty=reject_qty,
        scrap_qty=scrap_qty,
    )


def stage_progress(order: ProductionOrder) -> int:
    """Hitung progress tahap berjalan, bukan progress seluruh order."""

    if order.status == OrderStatus.SELESAI:
        return 100
    if order.status in (OrderStatus.MENUNGGU, OrderStatus.DIBATALKAN):
        return 0
    return current_stage_accounting(order).progress


def final_output_qty(order: ProductionOrder) -> int:
    """Total output final dari seluruh siklus QC."""

    return sum(
        log.output_qty
        for log in order.production_logs
        if log.stage == OrderStatus.QC
    )


def completion_loss_qty(order: ProductionOrder) -> int:
    """Selisih total order dengan output final yang sudah diterima QC."""

    return max(0, order.total_quantity - final_output_qty(order))
