"""Logika workflow produksi: transisi status dan penulisan log."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import WIB
from app.models import (
    OrderStatus,
    OrderStatusHistory,
    ProductionLog,
    ProductionOrder,
    User,
    UserRole,
)
from app.schemas.production_order import ProductionLogCreate, ProductionStatusUpdate
from app.services.production_metrics import (
    LOGGABLE_STATUSES,
    REWORK_TARGETS,
    TERMINAL_STATUSES,
    completion_loss_qty,
    current_stage_accounting,
    current_stage_input,
    current_stage_totals,
    final_output_qty,
)

STATUS_LABELS: dict[OrderStatus, str] = {
    OrderStatus.MENUNGGU: "Menunggu",
    OrderStatus.CUTTING: "Cutting",
    OrderStatus.JAHIT: "Jahit",
    OrderStatus.FINISHING: "Finishing",
    OrderStatus.QC: "QC",
    OrderStatus.SELESAI: "Selesai",
    OrderStatus.DIBATALKAN: "Dibatalkan",
}

_FORWARD_ROLES = frozenset({UserRole.ADMIN, UserRole.OPERATOR})
_QC_ROLES = frozenset({UserRole.ADMIN, UserRole.QC})
_ADMIN_ONLY = frozenset({UserRole.ADMIN})

ALLOWED_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.MENUNGGU: frozenset({OrderStatus.CUTTING, OrderStatus.DIBATALKAN}),
    OrderStatus.CUTTING: frozenset({OrderStatus.JAHIT, OrderStatus.DIBATALKAN}),
    OrderStatus.JAHIT: frozenset({OrderStatus.FINISHING, OrderStatus.DIBATALKAN}),
    OrderStatus.FINISHING: frozenset({OrderStatus.QC, OrderStatus.DIBATALKAN}),
    OrderStatus.QC: frozenset(
        {
            OrderStatus.SELESAI,
            OrderStatus.JAHIT,
            OrderStatus.FINISHING,
            OrderStatus.DIBATALKAN,
        }
    ),
    OrderStatus.SELESAI: frozenset(),
    OrderStatus.DIBATALKAN: frozenset(),
}

TRANSITION_ROLES: dict[tuple[OrderStatus, OrderStatus], frozenset[UserRole]] = {
    (OrderStatus.MENUNGGU, OrderStatus.CUTTING): _FORWARD_ROLES,
    (OrderStatus.MENUNGGU, OrderStatus.DIBATALKAN): _FORWARD_ROLES,
    (OrderStatus.CUTTING, OrderStatus.JAHIT): _FORWARD_ROLES,
    (OrderStatus.CUTTING, OrderStatus.DIBATALKAN): _ADMIN_ONLY,
    (OrderStatus.JAHIT, OrderStatus.FINISHING): _FORWARD_ROLES,
    (OrderStatus.JAHIT, OrderStatus.DIBATALKAN): _ADMIN_ONLY,
    (OrderStatus.FINISHING, OrderStatus.QC): _FORWARD_ROLES,
    (OrderStatus.FINISHING, OrderStatus.DIBATALKAN): _ADMIN_ONLY,
    (OrderStatus.QC, OrderStatus.SELESAI): _QC_ROLES,
    (OrderStatus.QC, OrderStatus.JAHIT): _QC_ROLES,
    (OrderStatus.QC, OrderStatus.FINISHING): _QC_ROLES,
    (OrderStatus.QC, OrderStatus.DIBATALKAN): _ADMIN_ONLY,
}

TRANSITION_NOTES_REQUIRED = frozenset(
    {
        (OrderStatus.MENUNGGU, OrderStatus.DIBATALKAN),
        (OrderStatus.CUTTING, OrderStatus.DIBATALKAN),
        (OrderStatus.JAHIT, OrderStatus.DIBATALKAN),
        (OrderStatus.FINISHING, OrderStatus.DIBATALKAN),
        (OrderStatus.QC, OrderStatus.DIBATALKAN),
        (OrderStatus.QC, OrderStatus.JAHIT),
        (OrderStatus.QC, OrderStatus.FINISHING),
    }
)

LOG_ROLES: dict[OrderStatus, frozenset[UserRole]] = {
    OrderStatus.CUTTING: _FORWARD_ROLES,
    OrderStatus.JAHIT: _FORWARD_ROLES,
    OrderStatus.FINISHING: _FORWARD_ROLES,
    OrderStatus.QC: _QC_ROLES,
}


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Perintah produksi tidak ditemukan.",
    )


def _forbidden() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Anda tidak memiliki akses untuk aksi ini.",
    )


def _conflict(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def _unprocessable(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=message,
    )


def _normalize_notes(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


async def _get_order_for_update(
    session: AsyncSession,
    order_id: UUID,
) -> ProductionOrder:
    order = await session.scalar(
        select(ProductionOrder)
        .where(
            ProductionOrder.id == order_id,
            ProductionOrder.deleted_at.is_(None),
        )
        .with_for_update(of=ProductionOrder)
    )
    if order is None:
        raise _not_found()
    return order


async def transition_order(
    session: AsyncSession,
    order_id: UUID,
    payload: ProductionStatusUpdate,
    *,
    actor: User,
) -> ProductionOrder:
    """Pindahkan status order sesuai state machine dan role aktor."""

    order = await _get_order_for_update(session, order_id)
    from_status = order.status
    to_status = payload.to_status

    if from_status in TERMINAL_STATUSES:
        raise _conflict("Perintah yang sudah selesai atau dibatalkan tidak dapat diubah.")

    if payload.expected_status != from_status:
        raise _conflict("Status perintah sudah berubah. Muat ulang data.")

    allowed_targets = ALLOWED_TRANSITIONS.get(from_status, frozenset())
    if to_status not in allowed_targets:
        raise _conflict(
            "Transisi dari "
            f"{STATUS_LABELS[from_status]} ke {STATUS_LABELS[to_status]} "
            "tidak diizinkan."
        )

    allowed_roles = TRANSITION_ROLES.get((from_status, to_status), frozenset())
    if actor.role not in allowed_roles:
        raise _forbidden()

    notes = _normalize_notes(payload.notes)
    if (from_status, to_status) in TRANSITION_NOTES_REQUIRED and notes is None:
        if to_status == OrderStatus.DIBATALKAN:
            raise _unprocessable("Alasan wajib diisi untuk membatalkan perintah.")
        raise _unprocessable("Alasan wajib diisi untuk mengembalikan order.")

    if to_status != OrderStatus.DIBATALKAN and from_status in LOGGABLE_STATUSES:
        accounting = current_stage_accounting(order)

        if accounting.input_qty > 0 and not accounting.has_log:
            raise _conflict(
                "Catat minimal satu log tahap "
                f"{STATUS_LABELS[from_status]} sebelum melanjutkan."
            )

        if accounting.input_qty > 0 and not accounting.is_complete:
            raise _conflict(
                f"Akuntansi tahap {STATUS_LABELS[from_status]} belum lengkap: "
                f"output + reject + scrap baru {accounting.accounted_qty} dari "
                f"{accounting.input_qty} pcs."
            )

        if (
            from_status == OrderStatus.QC
            and to_status in REWORK_TARGETS
            and accounting.reject_qty <= 0
        ):
            raise _conflict(
                "Rework hanya dapat dilakukan bila ada reject QC yang dapat diperbaiki."
            )

    if to_status == OrderStatus.SELESAI:
        output_qty = final_output_qty(order)
        if output_qty <= 0:
            raise _conflict(
                "Output final masih nol. Selesaikan produksi atau batalkan perintah."
            )

        loss_qty = completion_loss_qty(order)
        if loss_qty > 0 and notes is None:
            raise _unprocessable(
                "Alasan wajib diisi karena ada kehilangan "
                f"{loss_qty} pcs dari total order."
            )

    now = datetime.now(UTC)
    order.status = to_status

    if to_status == OrderStatus.CUTTING and order.started_at is None:
        order.started_at = now
    if to_status == OrderStatus.SELESAI:
        order.completed_at = now

    history = OrderStatusHistory(
        production_order_id=order.id,
        from_status=from_status,
        to_status=to_status,
        changed_by_id=actor.id,
        notes=notes or f"Status diubah menjadi {STATUS_LABELS[to_status]}.",
    )
    session.add(history)
    order.status_history.append(history)
    await session.flush()
    return order


async def add_production_log(
    session: AsyncSession,
    order_id: UUID,
    payload: ProductionLogCreate,
    *,
    actor: User,
) -> ProductionOrder:
    """Tambahkan log output/reject/scrap pada tahap yang sedang berjalan."""

    order = await _get_order_for_update(session, order_id)
    current_status = order.status

    if current_status not in LOGGABLE_STATUSES:
        raise _conflict(
            "Log produksi hanya dapat dicatat saat order berada di tahap produksi aktif."
        )

    allowed_roles = LOG_ROLES.get(current_status, frozenset())
    if actor.role not in allowed_roles:
        raise _forbidden()

    log_date = payload.log_date or datetime.now(WIB).date()
    if log_date > datetime.now(WIB).date():
        raise _unprocessable("Tanggal log tidak boleh melewati hari ini.")

    quantity = payload.output_qty + payload.reject_qty + payload.scrap_qty
    if quantity <= 0:
        raise _unprocessable(
            "Output, reject, dan scrap tidak boleh sama-sama nol."
        )

    if payload.reject_qty > 0 and current_status != OrderStatus.QC:
        raise _unprocessable(
            "Reject hanya dapat dicatat pada tahap QC. "
            "Gunakan scrap untuk material yang tidak dapat diperbaiki."
        )

    input_qty = current_stage_input(order)
    if input_qty <= 0:
        raise _conflict(
            "Tahap ini tidak memiliki input. Lanjutkan ke tahap berikutnya."
        )

    existing_output, existing_reject, existing_scrap = current_stage_totals(order)
    accounted = existing_output + existing_reject + existing_scrap
    remaining = max(0, input_qty - accounted)
    if quantity > remaining:
        raise _unprocessable(
            f"Jumlah output, reject, dan scrap melebihi sisa input tahap ini "
            f"({remaining} pcs)."
        )

    log = ProductionLog(
        production_order_id=order.id,
        stage=current_status,
        log_date=log_date,
        output_qty=payload.output_qty,
        reject_qty=payload.reject_qty,
        scrap_qty=payload.scrap_qty,
        notes=_normalize_notes(payload.notes),
        created_by_id=actor.id,
    )
    session.add(log)
    order.production_logs.append(log)
    await session.flush()
    return order
