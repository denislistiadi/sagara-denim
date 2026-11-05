"""Kondisi filter bersama untuk daftar dan papan antrean."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import exists, or_, select

from app.models import (
    Customer,
    OrderStatus,
    Priority,
    Product,
    ProductionOrder,
    ProductionOrderItem,
)
from app.services.production_orders.common import normalize_text


def order_conditions(
    *,
    search: str | None = None,
    status_filter: OrderStatus | None = None,
    priority: Priority | None = None,
    customer_id: UUID | None = None,
) -> tuple[list, str | None]:
    """Bangun kondisi filter yang dipakai daftar dan papan antrean.

    Mengembalikan kondisi SQLAlchemy dan kata kunci pencarian yang sudah
    dinormalisasi (atau None) supaya pemanggil tahu kapan perlu join Customer.
    """

    conditions = [ProductionOrder.deleted_at.is_(None)]
    normalized_search = normalize_text(search)

    if normalized_search:
        term = f"%{normalized_search}%"
        item_match = exists(
            select(1)
            .select_from(ProductionOrderItem)
            .join(Product, Product.id == ProductionOrderItem.product_id)
            .where(
                ProductionOrderItem.production_order_id == ProductionOrder.id,
                or_(
                    Product.name.ilike(term),
                    Product.code.ilike(term),
                ),
            )
        )
        conditions.append(
            or_(
                ProductionOrder.code.ilike(term),
                Customer.name.ilike(term),
                ProductionOrder.notes.ilike(term),
                item_match,
            )
        )

    if status_filter is not None:
        conditions.append(ProductionOrder.status == status_filter)
    if priority is not None:
        conditions.append(ProductionOrder.priority == priority)
    if customer_id is not None:
        conditions.append(ProductionOrder.customer_id == customer_id)

    return conditions, normalized_search
