"""Seed data awal yang idempoten.

Jalankan dengan:

    python -m app.seed
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import hash_password
from app.db import SessionLocal, engine
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
    StockMovement,
    StockMovementType,
    User,
    UserRole,
)

settings = get_settings()
WIB = timezone(timedelta(hours=7))


@dataclass(frozen=True)
class SeedOrder:
    """Definisi perintah produksi contoh."""

    code: str
    customer_code: str | None
    items: tuple[tuple[str, int], ...]
    status: OrderStatus
    priority: Priority
    deadline: date
    pic_email: str
    flow: tuple[tuple[OrderStatus, datetime], ...]
    logs: tuple[tuple[OrderStatus, date, int, int, str], ...]
    notes: str | None = None


CUSTOMERS = (
    ("CUST-001", "Toko Denim Jaya", "0812-1111-2201", "halo@denimjaya.test", "Bandung"),
    ("CUST-002", "Butik Rasa", "0812-1111-2202", "halo@butikrasa.test", "Jakarta"),
    ("CUST-003", "CV Kain Nusantara", "0812-1111-2203", "produksi@kainnusantara.test", "Solo"),
    ("CUST-004", "Distro Loka", "0812-1111-2204", "halo@distroloka.test", "Yogyakarta"),
)

PRODUCTS = (
    ("MDL-SLIM-32", "Jeans Slim Fit", "32", "Indigo", "Potongan slim dengan denim 14 oz."),
    ("MDL-STRAIGHT-34", "Jeans Straight", "34", "Indigo", "Potongan lurus klasik."),
    ("MDL-BOYFRIEND-28", "Jeans Boyfriend", "28", "Light Blue", "Potongan longgar."),
    ("MDL-SKINNY-30", "Jeans Skinny", "30", "Black", "Potongan ketat dengan stretch."),
    ("MDL-RELAXED-36", "Jeans Relaxed", "36", "Indigo", "Potongan santai untuk stok internal."),
)

MATERIALS = (
    ("MTL-DNM-14", "Denim Raw 14 oz", "Kain", "meter", Decimal("480"), Decimal("150")),
    ("MTL-BNG-01", "Benang Jahit Navy", "Benang", "roll", Decimal("84"), Decimal("30")),
    ("MTL-KNC-01", "Kancing Tembaga", "Aksesoris", "pcs", Decimal("1200"), Decimal("400")),
    ("MTL-LBL-01", "Label Kulit", "Aksesoris", "pcs", Decimal("240"), Decimal("100")),
)

ORDERS = (
    SeedOrder(
        code="PRD-2611-024",
        customer_code="CUST-001",
        items=(("MDL-SLIM-32", 80), ("MDL-SKINNY-30", 40)),
        status=OrderStatus.CUTTING,
        priority=Priority.TINGGI,
        deadline=date(2026, 11, 2),
        pic_email=settings.seed_operator_email,
        flow=(
            (OrderStatus.MENUNGGU, datetime(2026, 10, 30, 9, 0, tzinfo=WIB)),
            (OrderStatus.CUTTING, datetime(2026, 11, 1, 8, 0, tzinfo=WIB)),
        ),
        logs=((OrderStatus.CUTTING, date(2026, 11, 1), 48, 2, "Cutting panel depan."),),
        notes="Pesanan toko untuk rilis akhir pekan.",
    ),
    SeedOrder(
        code="PRD-2611-023",
        customer_code="CUST-002",
        items=(("MDL-STRAIGHT-34", 80),),
        status=OrderStatus.JAHIT,
        priority=Priority.TINGGI,
        deadline=date(2026, 11, 3),
        pic_email=settings.seed_operator_email,
        flow=(
            (OrderStatus.MENUNGGU, datetime(2026, 10, 29, 10, 0, tzinfo=WIB)),
            (OrderStatus.CUTTING, datetime(2026, 10, 30, 13, 0, tzinfo=WIB)),
            (OrderStatus.JAHIT, datetime(2026, 10, 31, 13, 0, tzinfo=WIB)),
        ),
        logs=(
            (OrderStatus.CUTTING, date(2026, 10, 30), 80, 0, "Cutting selesai."),
            (OrderStatus.JAHIT, date(2026, 10, 31), 40, 1, "Jahit badan dan kantong."),
        ),
    ),
    SeedOrder(
        code="PRD-2611-022",
        customer_code="CUST-003",
        items=(("MDL-BOYFRIEND-28", 64),),
        status=OrderStatus.FINISHING,
        priority=Priority.NORMAL,
        deadline=date(2026, 11, 4),
        pic_email=settings.seed_operator_email,
        flow=(
            (OrderStatus.MENUNGGU, datetime(2026, 10, 28, 8, 30, tzinfo=WIB)),
            (OrderStatus.CUTTING, datetime(2026, 10, 29, 9, 0, tzinfo=WIB)),
            (OrderStatus.JAHIT, datetime(2026, 10, 30, 10, 0, tzinfo=WIB)),
            (OrderStatus.FINISHING, datetime(2026, 11, 1, 9, 0, tzinfo=WIB)),
        ),
        logs=(
            (OrderStatus.CUTTING, date(2026, 10, 29), 64, 0, "Cutting selesai."),
            (OrderStatus.JAHIT, date(2026, 10, 30), 64, 1, "Jahit selesai."),
            (OrderStatus.FINISHING, date(2026, 11, 1), 54, 0, "Pemasangan kancing dan label."),
        ),
    ),
    SeedOrder(
        code="PRD-2611-021",
        customer_code="CUST-004",
        items=(("MDL-SKINNY-30", 150),),
        status=OrderStatus.QC,
        priority=Priority.NORMAL,
        deadline=date(2026, 11, 5),
        pic_email=settings.seed_qc_email,
        flow=(
            (OrderStatus.MENUNGGU, datetime(2026, 10, 27, 8, 0, tzinfo=WIB)),
            (OrderStatus.CUTTING, datetime(2026, 10, 28, 8, 0, tzinfo=WIB)),
            (OrderStatus.JAHIT, datetime(2026, 10, 29, 8, 0, tzinfo=WIB)),
            (OrderStatus.FINISHING, datetime(2026, 10, 31, 8, 0, tzinfo=WIB)),
            (OrderStatus.QC, datetime(2026, 11, 1, 8, 0, tzinfo=WIB)),
        ),
        logs=(
            (OrderStatus.CUTTING, date(2026, 10, 28), 150, 0, "Cutting selesai."),
            (OrderStatus.JAHIT, date(2026, 10, 29), 150, 2, "Jahit selesai."),
            (OrderStatus.FINISHING, date(2026, 10, 31), 148, 0, "Finishing selesai."),
            (OrderStatus.QC, date(2026, 11, 1), 96, 1, "Pemeriksaan sampel QC."),
        ),
    ),
    SeedOrder(
        code="PRD-2611-020",
        customer_code=None,
        items=(("MDL-RELAXED-36", 60),),
        status=OrderStatus.MENUNGGU,
        priority=Priority.RENDAH,
        deadline=date(2026, 11, 8),
        pic_email=settings.seed_admin_email,
        flow=((OrderStatus.MENUNGGU, datetime(2026, 11, 1, 7, 30, tzinfo=WIB)),),
        logs=(),
        notes="Produksi untuk stok internal, tanpa pelanggan.",
    ),
)


async def _get_or_create_user(
    session: AsyncSession,
    *,
    email: str,
    name: str,
    password: str,
    role: UserRole,
) -> User:
    user = await session.scalar(select(User).where(User.email == email))
    if user is not None:
        return user

    user = User(
        email=email,
        name=name,
        password_hash=hash_password(password),
        role=role,
    )
    session.add(user)
    await session.flush()
    return user


async def _get_or_create_customer(session: AsyncSession, data: tuple) -> Customer:
    code, name, phone, email, address = data
    customer = await session.scalar(select(Customer).where(Customer.code == code))
    if customer is not None:
        return customer

    customer = Customer(
        code=code,
        name=name,
        phone=phone,
        email=email,
        address=address,
    )
    session.add(customer)
    await session.flush()
    return customer


async def _get_or_create_product(session: AsyncSession, data: tuple) -> Product:
    code, name, size, color, description = data
    product = await session.scalar(select(Product).where(Product.code == code))
    if product is not None:
        return product

    product = Product(
        code=code,
        name=name,
        size=size,
        color=color,
        description=description,
    )
    session.add(product)
    await session.flush()
    return product


async def _get_or_create_material(
    session: AsyncSession,
    data: tuple,
    *,
    created_by_id,
) -> Material:
    sku, name, category, unit, stock_qty, minimum_stock = data
    material = await session.scalar(select(Material).where(Material.sku == sku))
    if material is not None:
        return material

    material = Material(
        sku=sku,
        name=name,
        category=category,
        unit=unit,
        stock_qty=stock_qty,
        minimum_stock=minimum_stock,
    )
    session.add(material)
    await session.flush()

    session.add(
        StockMovement(
            material_id=material.id,
            movement_type=StockMovementType.MASUK,
            quantity=stock_qty,
            note="Stok awal seed.",
            created_by_id=created_by_id,
        )
    )
    return material


async def _seed_order(
    session: AsyncSession,
    definition: SeedOrder,
    *,
    customers: dict[str, Customer],
    products: dict[str, Product],
    users: dict[str, User],
) -> bool:
    existing = await session.scalar(
        select(ProductionOrder).where(ProductionOrder.code == definition.code)
    )
    if existing is not None:
        return False

    customer = customers[definition.customer_code] if definition.customer_code else None
    pic = users[definition.pic_email]
    items = [
        ProductionOrderItem(
            product_id=products[product_code].id,
            quantity=quantity,
        )
        for product_code, quantity in definition.items
    ]

    order = ProductionOrder(
        code=definition.code,
        customer_id=customer.id if customer else None,
        pic_id=pic.id,
        created_by_id=users[settings.seed_admin_email].id,
        status=definition.status,
        priority=definition.priority,
        deadline=definition.deadline,
        total_quantity=sum(quantity for _, quantity in definition.items),
        notes=definition.notes,
        started_at=definition.flow[1][1] if len(definition.flow) > 1 else None,
        completed_at=(definition.flow[-1][1] if definition.status == OrderStatus.SELESAI else None),
        items=items,
    )
    session.add(order)
    await session.flush()

    previous: OrderStatus | None = None
    for status, changed_at in definition.flow:
        session.add(
            OrderStatusHistory(
                production_order_id=order.id,
                from_status=previous,
                to_status=status,
                changed_by_id=users[settings.seed_admin_email].id,
                notes=f"Status diubah menjadi {status.value}.",
                created_at=changed_at,
            )
        )
        previous = status

    for stage, log_date, output_qty, reject_qty, notes in definition.logs:
        session.add(
            ProductionLog(
                production_order_id=order.id,
                stage=stage,
                log_date=log_date,
                output_qty=output_qty,
                reject_qty=reject_qty,
                notes=notes,
                created_by_id=pic.id,
                created_at=datetime.combine(log_date, datetime.min.time(), tzinfo=WIB)
                + timedelta(hours=16),
            )
        )

    return True


async def seed() -> None:
    """Isi database dengan data awal tanpa membuat duplikat."""

    async with SessionLocal() as session:
        admin = await _get_or_create_user(
            session,
            email=settings.seed_admin_email,
            name="Admin Produksi",
            password=settings.seed_admin_password,
            role=UserRole.ADMIN,
        )
        operator = await _get_or_create_user(
            session,
            email=settings.seed_operator_email,
            name="Raka Pratama",
            password=settings.seed_operator_password,
            role=UserRole.OPERATOR,
        )
        qc = await _get_or_create_user(
            session,
            email=settings.seed_qc_email,
            name="Sinta Maharani",
            password=settings.seed_qc_password,
            role=UserRole.QC,
        )
        users = {
            admin.email: admin,
            operator.email: operator,
            qc.email: qc,
        }

        customers = {}
        for customer_data in CUSTOMERS:
            customer = await _get_or_create_customer(session, customer_data)
            customers[customer.code] = customer

        products = {}
        for product_data in PRODUCTS:
            product = await _get_or_create_product(session, product_data)
            products[product.code] = product

        for material_data in MATERIALS:
            await _get_or_create_material(
                session,
                material_data,
                created_by_id=admin.id,
            )

        created_orders = 0
        for order_definition in ORDERS:
            created = await _seed_order(
                session,
                order_definition,
                customers=customers,
                products=products,
                users=users,
            )
            created_orders += int(created)

        await session.commit()

        order_total = await session.scalar(select(func.count()).select_from(ProductionOrder))
        customer_total = await session.scalar(select(func.count()).select_from(Customer))
        product_total = await session.scalar(select(func.count()).select_from(Product))
        material_total = await session.scalar(select(func.count()).select_from(Material))

    print(
        "Seed selesai: "
        f"{3} pengguna, {customer_total} pelanggan, {product_total} model, "
        f"{material_total} bahan, {order_total} perintah produksi "
        f"({created_orders} baru)."
    )


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
