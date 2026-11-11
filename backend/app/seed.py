"""Seed data awal yang idempoten.

Jalankan dengan:

    python -m app.seed

Semua tanggal dibuat relatif terhadap waktu seed agar data demo tetap relevan.
Alur produksi mengikuti aturan akuntansi kuantitas:

- input tahap pertama = total order;
- transisi normal hanya meneruskan output;
- rework dari QC memakai reject QC sebagai input;
- output + reject + scrap harus sama dengan input sebelum keluar tahap.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import hash_password
from app.core.time import WIB
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

REWORK_TARGETS = frozenset({OrderStatus.JAHIT, OrderStatus.FINISHING})


@dataclass(frozen=True)
class SeedRun:
    """Satu kunjungan tahap produksi beserta akuntansinya."""

    stage: OrderStatus
    output_qty: int
    days_ago: int
    reject_qty: int = 0
    scrap_qty: int = 0
    complete: bool = True
    notes: str = ""


@dataclass(frozen=True)
class SeedOrder:
    """Definisi perintah produksi contoh berbasis rangkaian event."""

    code_index: int
    customer_code: str | None
    items: tuple[tuple[str, int], ...]
    status: OrderStatus
    priority: Priority
    deadline_offset: int
    pic_email: str
    runs: tuple[SeedRun, ...]
    notes: str | None = None
    cancel_reason: str | None = None


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
    ("MTL-DNM-12", "Denim Stretch 12 oz", "Kain", "meter", Decimal("45"), Decimal("120")),
    ("MTL-BNG-01", "Benang Jahit Navy", "Benang", "roll", Decimal("84"), Decimal("30")),
    ("MTL-KNC-01", "Kancing Tembaga", "Aksesoris", "pcs", Decimal("1200"), Decimal("400")),
    ("MTL-LBL-01", "Label Kulit", "Aksesoris", "pcs", Decimal("240"), Decimal("100")),
)

ORDERS = (
    SeedOrder(
        code_index=1,
        customer_code="CUST-001",
        items=(("MDL-SLIM-32", 80), ("MDL-SKINNY-30", 40)),
        status=OrderStatus.CUTTING,
        priority=Priority.TINGGI,
        deadline_offset=2,
        pic_email=settings.seed_operator_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=70,
                scrap_qty=5,
                days_ago=0,
                complete=False,
                notes="Cutting panel depan dan belakang.",
            ),
        ),
        notes="Pesanan toko untuk rilis akhir pekan.",
    ),
    SeedOrder(
        code_index=2,
        customer_code="CUST-002",
        items=(("MDL-STRAIGHT-34", 80),),
        status=OrderStatus.JAHIT,
        priority=Priority.TINGGI,
        deadline_offset=3,
        pic_email=settings.seed_operator_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=76,
                scrap_qty=4,
                days_ago=4,
                notes="Cutting selesai, 4 pcs kain cacat discrap.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=40,
                days_ago=0,
                complete=False,
                notes="Jahit badan dan kantong.",
            ),
        ),
    ),
    SeedOrder(
        code_index=3,
        customer_code="CUST-003",
        items=(("MDL-BOYFRIEND-28", 64),),
        status=OrderStatus.FINISHING,
        priority=Priority.NORMAL,
        deadline_offset=4,
        pic_email=settings.seed_operator_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=63,
                scrap_qty=1,
                days_ago=6,
                notes="Cutting selesai.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=62,
                scrap_qty=1,
                days_ago=4,
                notes="Jahit selesai.",
            ),
            SeedRun(
                stage=OrderStatus.FINISHING,
                output_qty=50,
                days_ago=0,
                complete=False,
                notes="Pemasangan kancing dan label.",
            ),
        ),
    ),
    SeedOrder(
        code_index=4,
        customer_code="CUST-004",
        items=(("MDL-SKINNY-30", 150),),
        status=OrderStatus.QC,
        priority=Priority.NORMAL,
        deadline_offset=5,
        pic_email=settings.seed_qc_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=148,
                scrap_qty=2,
                days_ago=10,
                notes="Cutting selesai.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=147,
                scrap_qty=1,
                days_ago=8,
                notes="Jahit selesai.",
            ),
            SeedRun(
                stage=OrderStatus.FINISHING,
                output_qty=146,
                scrap_qty=1,
                days_ago=6,
                notes="Finishing selesai.",
            ),
            SeedRun(
                stage=OrderStatus.QC,
                output_qty=126,
                reject_qty=18,
                scrap_qty=2,
                days_ago=0,
                notes="18 pcs cacat jahitan dapat diperbaiki, 2 pcs discrap.",
            ),
        ),
    ),
    SeedOrder(
        code_index=5,
        customer_code=None,
        items=(("MDL-RELAXED-36", 100),),
        status=OrderStatus.QC,
        priority=Priority.NORMAL,
        deadline_offset=7,
        pic_email=settings.seed_qc_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=98,
                scrap_qty=2,
                days_ago=16,
                notes="Cutting selesai.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=97,
                scrap_qty=1,
                days_ago=14,
                notes="Jahit selesai.",
            ),
            SeedRun(
                stage=OrderStatus.FINISHING,
                output_qty=96,
                scrap_qty=1,
                days_ago=12,
                notes="Finishing selesai.",
            ),
            SeedRun(
                stage=OrderStatus.QC,
                output_qty=88,
                reject_qty=6,
                scrap_qty=2,
                days_ago=10,
                notes="QC siklus pertama menemukan 6 pcs reject.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=5,
                scrap_qty=1,
                days_ago=8,
                notes="Rework jahitan dari reject QC.",
            ),
            SeedRun(
                stage=OrderStatus.FINISHING,
                output_qty=5,
                days_ago=6,
                notes="Finishing ulang hasil rework.",
            ),
            SeedRun(
                stage=OrderStatus.QC,
                output_qty=4,
                reject_qty=1,
                days_ago=0,
                notes="QC siklus kedua: 1 pcs masih perlu rework.",
            ),
        ),
        notes="Contoh dua siklus QC dengan rework dan scrap.",
    ),
    SeedOrder(
        code_index=6,
        customer_code="CUST-001",
        items=(("MDL-SLIM-32", 120),),
        status=OrderStatus.SELESAI,
        priority=Priority.NORMAL,
        deadline_offset=-1,
        pic_email=settings.seed_qc_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=118,
                scrap_qty=2,
                days_ago=20,
                notes="Cutting selesai.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=117,
                scrap_qty=1,
                days_ago=18,
                notes="Jahit selesai.",
            ),
            SeedRun(
                stage=OrderStatus.FINISHING,
                output_qty=116,
                scrap_qty=1,
                days_ago=16,
                notes="Finishing selesai.",
            ),
            SeedRun(
                stage=OrderStatus.QC,
                output_qty=112,
                scrap_qty=4,
                days_ago=14,
                notes="QC akhir: 4 pcs tidak lolos dan discrap.",
            ),
        ),
        notes="Contoh order selesai dengan kehilangan 8 pcs.",
    ),
    SeedOrder(
        code_index=7,
        customer_code="CUST-002",
        items=(("MDL-STRAIGHT-34", 60),),
        status=OrderStatus.SELESAI,
        priority=Priority.NORMAL,
        deadline_offset=0,
        pic_email=settings.seed_qc_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=60,
                days_ago=12,
                notes="Cutting selesai.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=60,
                days_ago=11,
                notes="Jahit selesai.",
            ),
            SeedRun(
                stage=OrderStatus.FINISHING,
                output_qty=60,
                days_ago=10,
                notes="Finishing selesai.",
            ),
            SeedRun(
                stage=OrderStatus.QC,
                output_qty=60,
                days_ago=9,
                notes="QC akhir selesai tanpa kehilangan.",
            ),
        ),
        notes="Contoh order selesai tanpa kehilangan.",
    ),
    SeedOrder(
        code_index=8,
        customer_code=None,
        items=(("MDL-RELAXED-36", 50),),
        status=OrderStatus.MENUNGGU,
        priority=Priority.RENDAH,
        deadline_offset=8,
        pic_email=settings.seed_admin_email,
        runs=(),
        notes="Produksi untuk stok internal, tanpa pelanggan.",
    ),
    SeedOrder(
        code_index=9,
        customer_code="CUST-003",
        items=(("MDL-BOYFRIEND-28", 90),),
        status=OrderStatus.DIBATALKAN,
        priority=Priority.RENDAH,
        deadline_offset=-2,
        pic_email=settings.seed_admin_email,
        runs=(),
        notes="Dibatalkan karena perubahan spesifikasi kain.",
        cancel_reason="Pelanggan mengubah spesifikasi kain sebelum produksi.",
    ),
    SeedOrder(
        code_index=10,
        customer_code="CUST-004",
        items=(("MDL-SKINNY-30", 90),),
        status=OrderStatus.JAHIT,
        priority=Priority.NORMAL,
        deadline_offset=6,
        pic_email=settings.seed_operator_email,
        runs=(
            SeedRun(
                stage=OrderStatus.CUTTING,
                output_qty=88,
                scrap_qty=2,
                days_ago=11,
                notes="Cutting selesai.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=86,
                scrap_qty=2,
                days_ago=9,
                notes="Jahit selesai.",
            ),
            SeedRun(
                stage=OrderStatus.FINISHING,
                output_qty=85,
                scrap_qty=1,
                days_ago=7,
                notes="Finishing selesai.",
            ),
            SeedRun(
                stage=OrderStatus.QC,
                output_qty=78,
                reject_qty=7,
                days_ago=5,
                notes="7 pcs reject dikembalikan untuk rework.",
            ),
            SeedRun(
                stage=OrderStatus.JAHIT,
                output_qty=3,
                days_ago=0,
                complete=False,
                notes="Rework 7 pcs reject QC, baru selesai 3 pcs.",
            ),
        ),
        notes="Contoh siklus rework yang masih berjalan di Jahit.",
    ),
)


def _event_times(now: datetime, days_ago: int) -> tuple[datetime, datetime, datetime]:
    """Bangun waktu masuk tahap, log, dan akhir siklus yang selalu di masa lalu."""

    end = now - timedelta(days=days_ago, minutes=10)
    start = end - timedelta(hours=8)
    logged_at = end - timedelta(hours=1)
    return start, logged_at, end


def _transition_notes(
    previous: OrderStatus,
    target: OrderStatus,
    run: SeedRun,
) -> str:
    """Buat catatan timeline yang sesuai dengan jenis transisi."""

    if target == OrderStatus.CUTTING:
        return "Mulai cutting."
    if previous == OrderStatus.QC and target in REWORK_TARGETS:
        return f"Rework dari QC: {run.notes or 'perbaikan cacat.'}"
    if target == OrderStatus.QC:
        return "Kirim ke QC."
    if target == OrderStatus.FINISHING:
        return "Lanjut ke finishing."
    if target == OrderStatus.JAHIT:
        return "Lanjut ke jahit."
    return f"Status diubah menjadi {target.value}."


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
            stock_before=Decimal("0"),
            stock_after=stock_qty,
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
    now: datetime,
) -> bool:
    code = f"PRD-{now:%y%m}-{900 + definition.code_index:03d}"
    existing = await session.scalar(
        select(ProductionOrder).where(ProductionOrder.code == code)
    )
    if existing is not None:
        return False

    customer = customers[definition.customer_code] if definition.customer_code else None
    pic = users[definition.pic_email]
    admin = users[settings.seed_admin_email]
    operator = users[settings.seed_operator_email]
    qc = users[settings.seed_qc_email]
    total_quantity = sum(quantity for _, quantity in definition.items)
    items = [
        ProductionOrderItem(
            product_id=products[product_code].id,
            quantity=quantity,
        )
        for product_code, quantity in definition.items
    ]

    if definition.runs:
        first_start, _, _ = _event_times(now, definition.runs[0].days_ago)
        created_at = first_start - timedelta(hours=2)
    else:
        created_at = now - timedelta(days=30)

    order = ProductionOrder(
        code=code,
        customer_id=customer.id if customer else None,
        pic_id=pic.id,
        created_by_id=admin.id,
        status=definition.status,
        priority=definition.priority,
        deadline=now.date() + timedelta(days=definition.deadline_offset),
        total_quantity=total_quantity,
        notes=definition.notes,
        created_at=created_at,
        updated_at=created_at,
        items=items,
    )
    session.add(order)
    await session.flush()

    session.add(
        OrderStatusHistory(
            production_order_id=order.id,
            from_status=None,
            to_status=OrderStatus.MENUNGGU,
            changed_by_id=admin.id,
            notes="Perintah produksi dibuat.",
            created_at=created_at,
        )
    )

    previous = OrderStatus.MENUNGGU
    previous_output = total_quantity
    previous_reject = 0
    started_at: datetime | None = None
    completed_at: datetime | None = None
    final_output = 0
    last_event_at = created_at

    for run in definition.runs:
        start, logged_at, end = _event_times(now, run.days_ago)

        if run.stage in REWORK_TARGETS and previous == OrderStatus.QC:
            input_qty = previous_reject
        elif previous == OrderStatus.MENUNGGU:
            input_qty = total_quantity
        else:
            input_qty = previous_output

        if run.reject_qty > 0 and run.stage != OrderStatus.QC:
            raise ValueError("Seed hanya boleh mencatat reject pada tahap QC.")
        if run.stage == OrderStatus.CUTTING and previous != OrderStatus.MENUNGGU:
            raise ValueError("Cutting hanya boleh dimulai dari status menunggu.")

        accounted = run.output_qty + run.reject_qty + run.scrap_qty
        if run.complete and accounted != input_qty:
            raise ValueError(
                f"{code} tahap {run.stage.value}: akuntansi {accounted} "
                f"tidak sama dengan input {input_qty}."
            )
        if not run.complete and accounted >= input_qty:
            raise ValueError(
                f"{code} tahap {run.stage.value}: tahap parsial sudah penuh."
            )

        actor = qc if run.stage == OrderStatus.QC else operator
        session.add(
            OrderStatusHistory(
                production_order_id=order.id,
                from_status=previous,
                to_status=run.stage,
                changed_by_id=actor.id,
                notes=_transition_notes(previous, run.stage, run),
                created_at=start,
            )
        )
        session.add(
            ProductionLog(
                production_order_id=order.id,
                stage=run.stage,
                log_date=logged_at.date(),
                output_qty=run.output_qty,
                reject_qty=run.reject_qty,
                scrap_qty=run.scrap_qty,
                notes=run.notes or None,
                created_by_id=actor.id,
                created_at=logged_at,
            )
        )

        if started_at is None and run.stage == OrderStatus.CUTTING:
            started_at = start
        if run.stage == OrderStatus.QC:
            final_output += run.output_qty

        previous = run.stage
        previous_output = run.output_qty
        previous_reject = run.reject_qty
        last_event_at = end

    if definition.status == OrderStatus.SELESAI:
        if previous != OrderStatus.QC:
            raise ValueError(f"{code} harus berakhir di QC sebelum selesai.")
        if not definition.runs or not definition.runs[-1].complete:
            raise ValueError(f"{code} belum menyelesaikan akuntansi QC.")

        completed_at = last_event_at
        loss = total_quantity - final_output
        completion_note = (
            f"Selesai. Kehilangan {loss} pcs tercatat sebagai scrap."
            if loss > 0
            else "Selesai tanpa kehilangan kuantitas."
        )
        session.add(
            OrderStatusHistory(
                production_order_id=order.id,
                from_status=OrderStatus.QC,
                to_status=OrderStatus.SELESAI,
                changed_by_id=qc.id,
                notes=completion_note,
                created_at=completed_at,
            )
        )
    elif definition.status == OrderStatus.DIBATALKAN:
        cancelled_at = (
            last_event_at + timedelta(hours=1)
            if definition.runs
            else created_at + timedelta(days=1)
        )
        session.add(
            OrderStatusHistory(
                production_order_id=order.id,
                from_status=previous,
                to_status=OrderStatus.DIBATALKAN,
                changed_by_id=admin.id,
                notes=definition.cancel_reason or "Perintah dibatalkan.",
                created_at=cancelled_at,
            )
        )
        last_event_at = cancelled_at
    elif definition.status == OrderStatus.MENUNGGU:
        if definition.runs:
            raise ValueError(f"{code} berstatus menunggu tetapi memiliki log.")
    elif previous != definition.status:
        raise ValueError(
            f"{code} berstatus {definition.status.value} tetapi run terakhir "
            f"berada di {previous.value}."
        )

    order.started_at = started_at
    order.completed_at = completed_at
    order.updated_at = last_event_at
    return True


def ensure_seed_allowed(environment: str) -> None:
    """Tolak seed demo di lingkungan produksi."""

    if environment == "production":
        raise RuntimeError(
            "Seed demo tidak boleh dijalankan saat ENVIRONMENT=production."
        )


async def seed() -> None:
    """Isi database dengan data awal tanpa membuat duplikat."""

    ensure_seed_allowed(settings.environment)
    now = datetime.now(WIB)

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
                now=now,
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
