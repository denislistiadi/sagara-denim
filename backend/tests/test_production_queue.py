"""Pengujian endpoint antrean produksi per tahap."""

from __future__ import annotations

from datetime import date

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrderStatus, Priority, User
from tests.support import login, seed_order


async def test_queue_returns_active_stages_and_excludes_terminal(
    client: AsyncClient,
    users,
    catalog: dict,
    session: AsyncSession,
) -> None:
    await login(client)
    await seed_order(
        session,
        catalog,
        code="PRD-2612-001",
        status=OrderStatus.MENUNGGU,
        priority=Priority.RENDAH,
        deadline=date(2026, 12, 10),
        quantity=10,
        customer_id=catalog["customer"].id,
        pic_id=users["operator"].id,
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-002",
        status=OrderStatus.CUTTING,
        priority=Priority.TINGGI,
        deadline=date(2026, 12, 5),
        quantity=20,
        customer_id=catalog["second_customer"].id,
        pic_id=users["operator"].id,
        logs=((OrderStatus.CUTTING, 10, 0, 0),),
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-003",
        status=OrderStatus.CUTTING,
        priority=Priority.NORMAL,
        deadline=date(2026, 12, 3),
        quantity=30,
        product_id=catalog["second_product"].id,
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-004",
        status=OrderStatus.CUTTING,
        priority=Priority.TINGGI,
        deadline=date(2026, 12, 1),
        quantity=40,
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-005",
        status=OrderStatus.JAHIT,
        priority=Priority.NORMAL,
        deadline=None,
        quantity=50,
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-006",
        status=OrderStatus.FINISHING,
        quantity=60,
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-007",
        status=OrderStatus.QC,
        quantity=70,
    )
    finished = await seed_order(
        session,
        catalog,
        code="PRD-2612-008",
        status=OrderStatus.SELESAI,
        quantity=80,
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-009",
        status=OrderStatus.DIBATALKAN,
        quantity=90,
    )
    assert (await client.delete(f"/api/production-orders/{finished.id}")).status_code == 200

    response = await client.get("/api/production-orders/queue")
    assert response.status_code == 200
    body = response.json()

    assert [stage["status"] for stage in body["stages"]] == [
        "menunggu",
        "cutting",
        "jahit",
        "finishing",
        "qc",
    ]
    assert body["total_orders"] == 7
    assert body["total_quantity"] == 280

    by_stage = {stage["status"]: stage for stage in body["stages"]}
    assert by_stage["menunggu"]["order_count"] == 1
    assert by_stage["cutting"]["order_count"] == 3
    assert by_stage["cutting"]["total_quantity"] == 90
    assert by_stage["jahit"]["order_count"] == 1
    assert by_stage["finishing"]["order_count"] == 1
    assert by_stage["qc"]["order_count"] == 1

    cutting_codes = [order["code"] for order in by_stage["cutting"]["orders"]]
    assert cutting_codes == ["PRD-2612-004", "PRD-2612-002", "PRD-2612-003"]

    cutting_progress = {order["code"]: order["progress"] for order in by_stage["cutting"]["orders"]}
    assert cutting_progress["PRD-2612-002"] == 50
    assert cutting_progress["PRD-2612-003"] == 0


async def test_queue_search_and_priority_filter(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
    session: AsyncSession,
) -> None:
    await login(client)
    await seed_order(
        session,
        catalog,
        code="PRD-2612-101",
        status=OrderStatus.CUTTING,
        priority=Priority.TINGGI,
        customer_id=catalog["customer"].id,
        quantity=20,
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-102",
        status=OrderStatus.CUTTING,
        priority=Priority.RENDAH,
        customer_id=catalog["second_customer"].id,
        product_id=catalog["second_product"].id,
        quantity=30,
        notes="Pesanan khusus",
    )
    await seed_order(
        session,
        catalog,
        code="PRD-2612-103",
        status=OrderStatus.MENUNGGU,
        priority=Priority.TINGGI,
        customer_id=catalog["customer"].id,
        quantity=40,
    )

    by_customer = await client.get(
        "/api/production-orders/queue",
        params={"search": "Toko Denim"},
    )
    assert by_customer.status_code == 200
    assert by_customer.json()["total_orders"] == 2

    by_model = await client.get(
        "/api/production-orders/queue",
        params={"search": "Straight"},
    )
    assert by_model.status_code == 200
    assert by_model.json()["total_orders"] == 1

    by_notes = await client.get(
        "/api/production-orders/queue",
        params={"search": "khusus"},
    )
    assert by_notes.json()["total_orders"] == 1

    by_priority = await client.get(
        "/api/production-orders/queue",
        params={"priority": "tinggi"},
    )
    assert by_priority.status_code == 200
    assert by_priority.json()["total_orders"] == 2
    assert all(
        order["priority"] == "tinggi"
        for stage in by_priority.json()["stages"]
        for order in stage["orders"]
    )


async def test_queue_limit_per_stage(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
    session: AsyncSession,
) -> None:
    await login(client)
    for index in range(5):
        await seed_order(
            session,
            catalog,
            code=f"PRD-2612-20{index}",
            status=OrderStatus.MENUNGGU,
            deadline=date(2026, 12, 20 + index),
            quantity=10 + index,
        )

    response = await client.get(
        "/api/production-orders/queue",
        params={"limit_per_stage": 2},
    )
    assert response.status_code == 200
    body = response.json()
    menunggu = next(stage for stage in body["stages"] if stage["status"] == "menunggu")
    assert menunggu["order_count"] == 5
    assert len(menunggu["orders"]) == 2

    invalid = await client.get(
        "/api/production-orders/queue",
        params={"limit_per_stage": 21},
    )
    assert invalid.status_code == 422


async def test_queue_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/production-orders/queue")
    assert response.status_code == 401
