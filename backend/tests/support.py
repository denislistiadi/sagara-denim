"""Helper bersama untuk pengujian produksi."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.time import WIB
from app.models import (
    Material,
    OrderStatus,
    OrderStatusHistory,
    Priority,
    ProductionLog,
    ProductionOrder,
    ProductionOrderItem,
)

settings = get_settings()


async def login(client: AsyncClient, role: str = "admin") -> None:
    """Login sebagai salah satu pengguna demo."""

    credentials = {
        "admin": (settings.seed_admin_email, settings.seed_admin_password),
        "operator": (
            settings.seed_operator_email,
            settings.seed_operator_password,
        ),
        "qc": (settings.seed_qc_email, settings.seed_qc_password),
    }
    email, password = credentials[role]
    response = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def create_payload(catalog: dict, **overrides) -> dict:
    """Payload pembuatan order standar untuk pengujian."""

    payload = {
        "customer_id": str(catalog["customer"].id),
        "pic_id": None,
        "priority": "normal",
        "deadline": "2026-11-12",
        "notes": None,
        "items": [
            {
                "product_id": str(catalog["product"].id),
                "quantity": 80,
                "notes": None,
            }
        ],
    }
    payload.update(overrides)
    return payload


async def seed_order(
    session: AsyncSession,
    catalog: dict,
    *,
    code: str,
    status: OrderStatus = OrderStatus.MENUNGGU,
    priority: Priority = Priority.NORMAL,
    deadline: date | None = None,
    customer_id: UUID | None = None,
    product_id: UUID | None = None,
    quantity: int = 10,
    notes: str | None = None,
    logs: tuple[tuple[OrderStatus, int, int], ...] = (),
    pic_id: UUID | None = None,
) -> ProductionOrder:
    """Buat order langsung di database untuk pengujian queue dan progress."""

    now = datetime.now(WIB)
    order = ProductionOrder(
        code=code,
        customer_id=customer_id,
        pic_id=pic_id,
        status=status,
        priority=priority,
        deadline=deadline,
        total_quantity=quantity,
        notes=notes,
        started_at=now if status not in (OrderStatus.MENUNGGU, OrderStatus.DIBATALKAN) else None,
        completed_at=now if status == OrderStatus.SELESAI else None,
    )
    order.items = [
        ProductionOrderItem(
            product_id=product_id or catalog["product"].id,
            quantity=quantity,
        )
    ]
    session.add(order)
    await session.flush()

    session.add(
        OrderStatusHistory(
            production_order_id=order.id,
            from_status=None,
            to_status=status,
            changed_by_id=pic_id,
            notes="Data pengujian.",
            created_at=now - timedelta(days=1),
        )
    )

    for stage, output_qty, reject_qty in logs:
        session.add(
            ProductionLog(
                production_order_id=order.id,
                stage=stage,
                log_date=now.date(),
                output_qty=output_qty,
                reject_qty=reject_qty,
                notes="Log pengujian.",
                created_by_id=pic_id,
            )
        )

    await session.commit()
    return order


def material_payload(**overrides) -> dict:
    """Payload pembuatan bahan standar untuk pengujian."""

    payload = {
        "sku": "MAT-UJI-01",
        "name": "Bahan Uji",
        "category": "Kain",
        "unit": "meter",
        "minimum_stock": "10.00",
        "initial_stock": "0.00",
    }
    payload.update(overrides)
    return payload


def movement_payload(movement_type: str = "masuk", **overrides) -> dict:
    """Payload mutasi stok standar untuk pengujian."""

    payload: dict = {"movement_type": movement_type}
    if movement_type == "penyesuaian":
        payload.update({"target_stock": "10.00", "note": "Hasil stock opname"})
    else:
        payload.update({"quantity": "5.00"})
    payload.update(overrides)
    return payload


async def seed_material(
    session: AsyncSession,
    *,
    sku: str,
    name: str | None = None,
    category: str = "Kain",
    unit: str = "meter",
    stock_qty: Decimal | str = Decimal("0"),
    minimum_stock: Decimal | str = Decimal("10"),
    is_active: bool = True,
) -> Material:
    """Buat bahan langsung di database untuk pengujian."""

    material = Material(
        sku=sku,
        name=name or f"Bahan {sku}",
        category=category,
        unit=unit,
        stock_qty=Decimal(str(stock_qty)),
        minimum_stock=Decimal(str(minimum_stock)),
        is_active=is_active,
    )
    session.add(material)
    await session.commit()
    return material


async def seed_log(
    session: AsyncSession,
    order: ProductionOrder,
    *,
    stage: OrderStatus,
    log_date: date,
    output_qty: int,
    reject_qty: int,
    notes: str | None = None,
    created_by_id: UUID | None = None,
    created_at: datetime | None = None,
) -> ProductionLog:
    """Tambahkan log produksi pada order untuk pengujian laporan."""

    log = ProductionLog(
        production_order_id=order.id,
        stage=stage,
        log_date=log_date,
        output_qty=output_qty,
        reject_qty=reject_qty,
        notes=notes,
        created_by_id=created_by_id,
        created_at=created_at or datetime.now(WIB),
    )
    session.add(log)
    await session.commit()
    return log

