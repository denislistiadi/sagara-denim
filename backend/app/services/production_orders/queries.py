"""Kueri (baca) perintah produksi: detail, daftar, dan antrean."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models import (
    Customer,
    OrderStatus,
    OrderStatusHistory,
    Priority,
    ProductionLog,
    ProductionOrder,
    ProductionOrderItem,
)
from app.schemas.production_order import (
    ProductionOrderDetail,
    ProductionOrderList,
    ProductionQueueResponse,
    ProductionQueueStage,
)
from app.services.production_metrics import ACTIVE_STATUSES
from app.services.production_orders.common import not_found
from app.services.production_orders.filters import order_conditions
from app.services.production_orders.mappers import to_detail, to_list_item

# Urutan tahap pada papan antrean.
QUEUE_STAGES = (
    OrderStatus.MENUNGGU,
    OrderStatus.CUTTING,
    OrderStatus.JAHIT,
    OrderStatus.FINISHING,
    OrderStatus.QC,
)


async def get_order_detail(
    session: AsyncSession,
    order_id: UUID,
) -> ProductionOrderDetail:
    """Ambil detail order aktif atau lempar 404."""

    order = await session.scalar(
        select(ProductionOrder)
        .where(
            ProductionOrder.id == order_id,
            ProductionOrder.deleted_at.is_(None),
        )
        .options(
            selectinload(ProductionOrder.items).joinedload(ProductionOrderItem.product),
            selectinload(ProductionOrder.status_history).joinedload(
                OrderStatusHistory.changed_by
            ),
            selectinload(ProductionOrder.production_logs).joinedload(
                ProductionLog.created_by
            ),
            joinedload(ProductionOrder.customer),
            joinedload(ProductionOrder.pic),
            joinedload(ProductionOrder.created_by),
        )
    )
    if order is None:
        raise not_found()

    return to_detail(order)


async def list_orders(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    status_filter: OrderStatus | None = None,
    priority: Priority | None = None,
    customer_id: UUID | None = None,
) -> ProductionOrderList:
    """Ambil daftar order dengan filter dan pagination di server."""

    conditions, normalized_search = order_conditions(
        search=search,
        status_filter=status_filter,
        priority=priority,
        customer_id=customer_id,
    )

    count_stmt = select(func.count(ProductionOrder.id)).select_from(ProductionOrder)
    list_stmt = select(ProductionOrder)

    if normalized_search:
        count_stmt = count_stmt.outerjoin(
            Customer, Customer.id == ProductionOrder.customer_id
        )
        list_stmt = list_stmt.outerjoin(
            Customer, Customer.id == ProductionOrder.customer_id
        )

    total = await session.scalar(count_stmt.where(*conditions)) or 0

    orders = (
        (
            await session.scalars(
                list_stmt.where(*conditions)
                .options(
                    selectinload(ProductionOrder.items).joinedload(
                        ProductionOrderItem.product
                    ),
                    selectinload(ProductionOrder.production_logs),
                    selectinload(ProductionOrder.status_history),
                )
                .order_by(
                    ProductionOrder.deadline.asc().nulls_last(),
                    ProductionOrder.created_at.desc(),
                    ProductionOrder.id,
                )
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .unique()
        .all()
    )

    total_pages = (total + page_size - 1) // page_size if total else 0

    return ProductionOrderList(
        items=[to_list_item(order) for order in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _queue_order_by() -> tuple:
    """Urutan antrean: prioritas, deadline, lalu order terlama."""

    return (
        case(
            (ProductionOrder.priority == Priority.TINGGI, 0),
            (ProductionOrder.priority == Priority.NORMAL, 1),
            else_=2,
        ),
        ProductionOrder.deadline.asc().nulls_last(),
        ProductionOrder.created_at.asc(),
        ProductionOrder.id.asc(),
    )


async def list_queue(
    session: AsyncSession,
    *,
    search: str | None = None,
    priority: Priority | None = None,
    limit_per_stage: int = 6,
) -> ProductionQueueResponse:
    """Ambil ringkasan order aktif per tahap untuk papan antrean."""

    conditions, normalized_search = order_conditions(
        search=search,
        priority=priority,
    )
    active_conditions = [
        *conditions,
        ProductionOrder.status.in_(ACTIVE_STATUSES),
    ]

    aggregate_stmt = select(
        ProductionOrder.status,
        func.count(ProductionOrder.id),
        func.coalesce(func.sum(ProductionOrder.total_quantity), 0),
    ).select_from(ProductionOrder)
    if normalized_search:
        aggregate_stmt = aggregate_stmt.outerjoin(
            Customer,
            Customer.id == ProductionOrder.customer_id,
        )

    aggregate_rows = (
        await session.execute(
            aggregate_stmt.where(*active_conditions).group_by(ProductionOrder.status)
        )
    ).all()
    stats = {
        status_value: (order_count, int(total_quantity))
        for status_value, order_count, total_quantity in aggregate_rows
    }

    list_stmt = select(ProductionOrder)
    if normalized_search:
        list_stmt = list_stmt.outerjoin(
            Customer,
            Customer.id == ProductionOrder.customer_id,
        )

    stages: list[ProductionQueueStage] = []
    total_orders = 0
    total_quantity = 0

    for stage in QUEUE_STAGES:
        order_count, stage_quantity = stats.get(stage, (0, 0))
        total_orders += order_count
        total_quantity += stage_quantity

        orders = (
            (
                await session.scalars(
                    list_stmt.where(
                        *active_conditions,
                        ProductionOrder.status == stage,
                    )
                    .options(
                        selectinload(ProductionOrder.items).joinedload(
                            ProductionOrderItem.product
                        ),
                        selectinload(ProductionOrder.production_logs),
                        selectinload(ProductionOrder.status_history),
                        joinedload(ProductionOrder.customer),
                        joinedload(ProductionOrder.pic),
                    )
                    .order_by(*_queue_order_by())
                    .limit(limit_per_stage)
                )
            )
            .unique()
            .all()
        )

        stages.append(
            ProductionQueueStage(
                status=stage,
                order_count=order_count,
                total_quantity=stage_quantity,
                orders=[to_list_item(order) for order in orders],
            )
        )

    return ProductionQueueResponse(
        stages=stages,
        total_orders=total_orders,
        total_quantity=total_quantity,
    )
