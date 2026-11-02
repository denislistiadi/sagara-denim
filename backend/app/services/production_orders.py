"""Logika bisnis perintah produksi."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import exists, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models import (
    Customer,
    OrderStatus,
    OrderStatusHistory,
    Priority,
    Product,
    ProductionLog,
    ProductionOrder,
    ProductionOrderItem,
    User,
)
from app.schemas.catalog import CustomerOption, ProductOption
from app.schemas.production_order import (
    OrderStatusHistoryRead,
    ProductionLogRead,
    ProductionOrderCreate,
    ProductionOrderDetail,
    ProductionOrderItemInput,
    ProductionOrderItemRead,
    ProductionOrderList,
    ProductionOrderListItem,
    ProductionOrderUpdate,
)
from app.schemas.user import UserOption
from app.services.production_metrics import stage_progress

# WIB tidak memakai daylight saving sehingga offset tetap aman tanpa tzdata.
WIB = timezone(timedelta(hours=7))
CODE_LOCK_KEY = "sagara:production-order-code"
CODE_PREFIX = "PRD"


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Perintah produksi tidak ditemukan.",
    )


def _invalid_reference(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=message,
    )


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


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
    numbers = [int(suffix) for code in codes if (suffix := code.removeprefix(prefix)).isdigit()]
    return f"{prefix}{max(numbers, default=0) + 1:03d}"


async def _get_customer(
    session: AsyncSession,
    customer_id: UUID | None,
) -> Customer | None:
    if customer_id is None:
        return None

    customer = await session.get(Customer, customer_id)
    if customer is None or not customer.is_active:
        raise _invalid_reference("Pelanggan tidak ditemukan atau tidak aktif.")
    return customer


async def _get_pic(session: AsyncSession, pic_id: UUID | None) -> User | None:
    if pic_id is None:
        return None

    user = await session.get(User, pic_id)
    if user is None or not user.is_active:
        raise _invalid_reference("PIC tidak ditemukan atau tidak aktif.")
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
        raise _invalid_reference("Salah satu model produk tidak ditemukan atau tidak aktif.")

    return by_id


def _build_items(
    items: Sequence[ProductionOrderItemInput],
    products: dict[UUID, Product],
) -> list[ProductionOrderItem]:
    return [
        ProductionOrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            notes=_normalize_text(item.notes),
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
    products = await _load_products(session, payload.items)
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
        notes=_normalize_text(payload.notes),
        items=_build_items(payload.items, products),
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
        raise _not_found()

    fields = payload.model_fields_set

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
        order.notes = _normalize_text(payload.notes)

    if payload.items is not None:
        products = await _load_products(session, payload.items)
        order.items.clear()
        order.items.extend(_build_items(payload.items, products))
        order.total_quantity = sum(item.quantity for item in payload.items)

    await session.flush()
    return order


async def archive_order(session: AsyncSession, order_id: UUID) -> None:
    """Arsipkan perintah produksi tanpa menghapus riwayat."""

    order = await session.scalar(select(ProductionOrder).where(ProductionOrder.id == order_id))
    if order is None or order.deleted_at is not None:
        raise _not_found()

    order.deleted_at = datetime.now(UTC)
    await session.flush()


def _model_summary(order: ProductionOrder) -> str:
    if not order.items:
        return "Belum ada model"

    first = order.items[0].product.name
    if len(order.items) == 1:
        return first
    return f"{first} +{len(order.items) - 1} model"


def to_list_item(order: ProductionOrder) -> ProductionOrderListItem:
    """Petakan model SQLAlchemy menjadi ringkasan response."""

    return ProductionOrderListItem(
        id=order.id,
        code=order.code,
        customer=(CustomerOption.model_validate(order.customer) if order.customer else None),
        pic=UserOption.model_validate(order.pic) if order.pic else None,
        status=order.status,
        priority=order.priority,
        deadline=order.deadline,
        total_quantity=order.total_quantity,
        item_count=len(order.items),
        model_summary=_model_summary(order),
        progress=stage_progress(order),
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


def to_detail(order: ProductionOrder) -> ProductionOrderDetail:
    """Petakan model SQLAlchemy menjadi detail response."""

    return ProductionOrderDetail(
        **to_list_item(order).model_dump(),
        notes=order.notes,
        started_at=order.started_at,
        completed_at=order.completed_at,
        created_by=(UserOption.model_validate(order.created_by) if order.created_by else None),
        items=[
            ProductionOrderItemRead(
                id=item.id,
                product=ProductOption.model_validate(item.product),
                quantity=item.quantity,
                notes=item.notes,
            )
            for item in order.items
        ],
        status_history=[
            OrderStatusHistoryRead(
                id=history.id,
                from_status=history.from_status,
                to_status=history.to_status,
                changed_by=(
                    UserOption.model_validate(history.changed_by) if history.changed_by else None
                ),
                notes=history.notes,
                created_at=history.created_at,
            )
            for history in order.status_history
        ],
        production_logs=[
            ProductionLogRead(
                id=log.id,
                stage=log.stage,
                log_date=log.log_date,
                output_qty=log.output_qty,
                reject_qty=log.reject_qty,
                notes=log.notes,
                created_by=(UserOption.model_validate(log.created_by) if log.created_by else None),
                created_at=log.created_at,
            )
            for log in order.production_logs
        ],
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
            selectinload(ProductionOrder.status_history).joinedload(OrderStatusHistory.changed_by),
            selectinload(ProductionOrder.production_logs).joinedload(ProductionLog.created_by),
            joinedload(ProductionOrder.customer),
            joinedload(ProductionOrder.pic),
            joinedload(ProductionOrder.created_by),
        )
    )
    if order is None:
        raise _not_found()

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

    conditions = [ProductionOrder.deleted_at.is_(None)]
    normalized_search = _normalize_text(search)

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

    count_stmt = select(func.count(ProductionOrder.id)).select_from(ProductionOrder)
    list_stmt = select(ProductionOrder)

    if normalized_search:
        count_stmt = count_stmt.outerjoin(Customer, Customer.id == ProductionOrder.customer_id)
        list_stmt = list_stmt.outerjoin(Customer, Customer.id == ProductionOrder.customer_id)

    total = await session.scalar(count_stmt.where(*conditions)) or 0

    orders = (
        (
            await session.scalars(
                list_stmt.where(*conditions)
                .options(
                    selectinload(ProductionOrder.items).joinedload(ProductionOrderItem.product),
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
