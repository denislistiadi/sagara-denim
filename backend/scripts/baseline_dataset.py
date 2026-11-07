"""Dataset representatif untuk pengukuran baseline performa."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import WIB
from app.models import (
    Customer,
    Material,
    OrderStatus,
    OrderStatusHistory,
    Priority,
    Product,
    ProductionLog,
    ProductionOrder,
    ProductionOrderItem,
    User,
    UserRole,
)

CUSTOMERS = 20
PRODUCTS = 20
MATERIALS = 50
ORDERS_PER_STAGE = 10
COMPLETED_ORDERS = 10
LOGS_PER_ORDER = 2

ACTIVE_STAGES = (
    OrderStatus.MENUNGGU,
    OrderStatus.CUTTING,
    OrderStatus.JAHIT,
    OrderStatus.FINISHING,
    OrderStatus.QC,
)
LOG_STAGES = (
    OrderStatus.CUTTING,
    OrderStatus.JAHIT,
    OrderStatus.FINISHING,
    OrderStatus.QC,
)
PRIORITIES = (Priority.TINGGI, Priority.NORMAL, Priority.RENDAH)
CATEGORIES = ("Kain", "Benang", "Aksesoris", "Label")


async def seed(session: AsyncSession) -> str:
    """Isi database dengan data representatif dan kembalikan ringkasannya."""

    now = datetime.now(UTC)
    today = now.astimezone(WIB).date()

    admin = User(
        email="baseline-admin@sagara.test",
        name="Admin Baseline",
        password_hash="tidak-dipakai",
        role=UserRole.ADMIN,
    )
    operator = User(
        email="baseline-operator@sagara.test",
        name="Operator Baseline",
        password_hash="tidak-dipakai",
        role=UserRole.OPERATOR,
    )
    qc = User(
        email="baseline-qc@sagara.test",
        name="QC Baseline",
        password_hash="tidak-dipakai",
        role=UserRole.QC,
    )
    session.add_all([admin, operator, qc])

    customers = [
        Customer(
            code=f"CUST-B{index:03d}",
            name=f"Pelanggan Baseline {index:02d}",
            phone=f"0812-0000-{index:04d}",
            address="Bandung",
        )
        for index in range(CUSTOMERS)
    ]
    products = [
        Product(
            code=f"MDL-B{index:03d}",
            name=f"Model Baseline {index:02d}",
            size=str(28 + index % 10),
            color="Indigo",
        )
        for index in range(PRODUCTS)
    ]
    session.add_all([*customers, *products])
    await session.flush()

    materials = []
    for index in range(MATERIALS):
        minimum = Decimal("20")
        if index % 10 == 0:
            stock = Decimal("0")
        elif index % 10 == 1:
            stock = minimum * Decimal("0.25")
        elif index % 10 == 2:
            stock = minimum * Decimal("0.75")
        else:
            stock = minimum * Decimal("3")
        materials.append(
            Material(
                sku=f"MTL-B{index:03d}",
                name=f"Bahan Baseline {index:02d}",
                category=CATEGORIES[index % len(CATEGORIES)],
                unit="meter",
                stock_qty=stock,
                minimum_stock=minimum,
            )
        )
    session.add_all(materials)

    orders = []
    counter = 0
    for stage_index, status in enumerate(ACTIVE_STAGES):
        for index in range(ORDERS_PER_STAGE):
            counter += 1
            quantity = 40 + index * 3
            order = ProductionOrder(
                code=f"PRD-BASE-{counter:04d}",
                customer_id=customers[index % CUSTOMERS].id,
                pic_id=operator.id if status != OrderStatus.QC else qc.id,
                created_by_id=admin.id,
                status=status,
                priority=PRIORITIES[(stage_index + index) % len(PRIORITIES)],
                deadline=today + timedelta(days=(index % 9) - 3),
                total_quantity=quantity,
                started_at=(
                    None
                    if status == OrderStatus.MENUNGGU
                    else now - timedelta(days=(stage_index + 1))
                ),
            )
            order.items = [
                ProductionOrderItem(
                    product_id=products[index % PRODUCTS].id,
                    quantity=quantity // 2,
                ),
                ProductionOrderItem(
                    product_id=products[(index + 1) % PRODUCTS].id,
                    quantity=quantity - quantity // 2,
                ),
            ]
            order.status_history = [
                OrderStatusHistory(
                    from_status=None,
                    to_status=status,
                    changed_by_id=admin.id,
                    notes="Baseline.",
                    created_at=now - timedelta(days=stage_index + 2),
                )
            ]
            order.production_logs = [
                ProductionLog(
                    stage=LOG_STAGES[(index + log_index) % len(LOG_STAGES)],
                    log_date=today - timedelta(days=log_index),
                    output_qty=8 + index,
                    reject_qty=log_index,
                    notes="Log baseline.",
                    created_by_id=operator.id,
                    created_at=now - timedelta(days=log_index),
                )
                for log_index in range(LOGS_PER_ORDER)
            ]
            orders.append(order)

    for index in range(COMPLETED_ORDERS):
        counter += 1
        completed_at = now - timedelta(days=index * 3)
        completed_date = completed_at.astimezone(WIB).date()
        quantity = 60 + index
        order = ProductionOrder(
            code=f"PRD-BASE-{counter:04d}",
            customer_id=customers[index % CUSTOMERS].id,
            pic_id=operator.id,
            created_by_id=admin.id,
            status=OrderStatus.SELESAI,
            priority=Priority.NORMAL,
            deadline=completed_date
            + (timedelta(days=1) if index % 2 else timedelta(days=-1)),
            total_quantity=quantity,
            started_at=completed_at - timedelta(days=5),
            completed_at=completed_at,
        )
        order.items = [
            ProductionOrderItem(
                product_id=products[index % PRODUCTS].id,
                quantity=quantity,
            )
        ]
        order.status_history = [
            OrderStatusHistory(
                from_status=None,
                to_status=OrderStatus.SELESAI,
                changed_by_id=admin.id,
                notes="Baseline selesai.",
                created_at=completed_at,
            )
        ]
        order.production_logs = [
            ProductionLog(
                stage=OrderStatus.QC,
                log_date=completed_date,
                output_qty=quantity,
                reject_qty=1,
                notes="Log selesai.",
                created_by_id=qc.id,
                created_at=completed_at,
            )
        ]
        orders.append(order)

    session.add_all(orders)
    await session.commit()

    return (
        f"{CUSTOMERS} pelanggan, {PRODUCTS} produk, {MATERIALS} bahan, "
        f"{len(orders)} order, {len(orders) * LOGS_PER_ORDER + COMPLETED_ORDERS} log"
    )
