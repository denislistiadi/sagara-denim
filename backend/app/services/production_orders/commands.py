"""Perintah (tulis) perintah produksi: buat, ubah, dan arsipkan."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import WIB
from app.models import (
    Customer,
    OrderStatus,
    OrderStatusHistory,
    Product,
    ProductionOrder,
    ProductionOrderItem,
    User,
)
from app.schemas.production_order import (
    ProductionOrderCreate,
    ProductionOrderItemInput,
    ProductionOrderUpdate,
)
from app.services.production_metrics import TERMINAL_STATUSES
from app.services.production_orders.common import (
    conflict,
    invalid_reference,
    normalize_text,
    not_found,
)

CODE_LOCK_KEY = "sagara:production-order-code"
CODE_PREFIX = "PRD"


async def _next_code(session: AsyncSession) -> str:
    """Buat kode order berurutan per bulan dengan lock transaksi."""

    now = datetime.now(WIB)
    prefix = f"{CODE_PREFIX}-{now:%y%m}-"
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
        {"lock_key": CODE_LOCK_KEY},
    )
    codes = (
        await session.scalars(
            select(ProductionOrder.code).where(ProductionOrder.code.like(f"{prefix}%"))
        )
    ).all()
    numbers = [
        int(suffix)
        for code in codes
        if (suffix := code.removeprefix(prefix)).isdigit()
    ]
    return f"{prefix}{max(numbers, default=0) + 1:03d}"


async def _get_customer(
    session: AsyncSession,
    customer_id: UUID | None,
) -> Customer | None:
    if customer_id is None:
        return None

    customer = await session.get(Customer, customer_id)
    if customer is None or not customer.is_active:
        raise invalid_reference("Pelanggan tidak ditemukan atau tidak aktif.")
    return customer


async def _get_pic(session: AsyncSession, pic_id: UUID | None) -> User | None:
    if pic_id is None:
        return None

    user = await session.get(User, pic_id)
    if user is None or not user.is_active:
        raise invalid_reference("PIC tidak ditemukan atau tidak aktif.")
    return user


async def _load_products(
    session: AsyncSession,
    items: Sequence[ProductionOrderItemInput],
) -> dict[UUID, Product]:
    product_ids = [item.product_id for item in items]
    products = (
        await session.scalars(
            select(Product).where(
                Product.id.in_(product_ids),
                Product.is_active.is_(True),
            )
        )
    ).all()
    by_id = {product.id: product for product in products}

    missing = [product_id for product_id in product_ids if product_id not in by_id]
    if missing:
        raise invalid_reference(
            "Salah satu model produk tidak ditemukan atau tidak aktif."
        )

    return by_id


def _build_items(
    items: Sequence[ProductionOrderItemInput],
) -> list[ProductionOrderItem]:
    return [
        ProductionOrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            notes=normalize_text(item.notes),
        )
        for item in items
    ]


async def create_order(
    session: AsyncSession,
    payload: ProductionOrderCreate,
    *,
    created_by: User,
) -> ProductionOrder:
    """Buat perintah produksi baru beserta item dan history awal."""

    await _get_customer(session, payload.customer_id)
    await _get_pic(session, payload.pic_id)
    await _load_products(session, payload.items)
    code = await _next_code(session)

    order = ProductionOrder(
        code=code,
        customer_id=payload.customer_id,
        pic_id=payload.pic_id,
        created_by_id=created_by.id,
        status=OrderStatus.MENUNGGU,
        priority=payload.priority,
        deadline=payload.deadline,
        total_quantity=sum(item.quantity for item in payload.items),
        notes=normalize_text(payload.notes),
        items=_build_items(payload.items),
    )
    session.add(order)
    await session.flush()

    session.add(
        OrderStatusHistory(
            production_order_id=order.id,
            from_status=None,
            to_status=OrderStatus.MENUNGGU,
            changed_by_id=created_by.id,
            notes="Perintah produksi dibuat.",
        )
    )
    await session.flush()
    return order


async def update_order(
    session: AsyncSession,
    order_id: UUID,
    payload: ProductionOrderUpdate,
) -> ProductionOrder:
    """Ubah header dan/atau item perintah produksi."""

    order = await session.scalar(
        select(ProductionOrder)
        .where(
            ProductionOrder.id == order_id,
            ProductionOrder.deleted_at.is_(None),
        )
        .with_for_update(of=ProductionOrder)
    )
    if order is None:
        raise not_found()

    if order.status in TERMINAL_STATUSES:
        raise conflict(
            "Perintah yang sudah selesai atau dibatalkan tidak dapat diubah."
        )

    fields = payload.model_fields_set

    if payload.items is not None and order.status != OrderStatus.MENUNGGU:
        raise conflict("Item perintah hanya dapat diubah saat status Menunggu.")

    if "customer_id" in fields:
        customer = await _get_customer(session, payload.customer_id)
        order.customer = customer
        order.customer_id = payload.customer_id

    if "pic_id" in fields:
        pic = await _get_pic(session, payload.pic_id)
        order.pic = pic
        order.pic_id = payload.pic_id

    if "priority" in fields and payload.priority is not None:
        order.priority = payload.priority

    if "deadline" in fields:
        order.deadline = payload.deadline

    if "notes" in fields:
        order.notes = normalize_text(payload.notes)

    if payload.items is not None:
        await _load_products(session, payload.items)
        order.items.clear()
        order.items.extend(_build_items(payload.items))
        order.total_quantity = sum(item.quantity for item in payload.items)

    await session.flush()
    return order


async def archive_order(session: AsyncSession, order_id: UUID) -> None:
    """Arsipkan perintah produksi tanpa menghapus riwayat."""

    order = await session.scalar(
        select(ProductionOrder).where(ProductionOrder.id == order_id)
    )
    if order is None or order.deleted_at is not None:
        raise not_found()

    if order.status not in TERMINAL_STATUSES:
        raise conflict(
            "Hanya perintah yang sudah selesai atau dibatalkan yang dapat diarsipkan."
        )

    order.deleted_at = datetime.now(UTC)
    await session.flush()
