"""Pengujian alur perintah produksi dan matriks peran."""

from datetime import date
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import (
    OrderStatus,
    OrderStatusHistory,
    Priority,
    ProductionLog,
    ProductionOrder,
    ProductionOrderItem,
    User,
)

settings = get_settings()


async def _login(client: AsyncClient, role: str = "admin") -> None:
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


def _create_payload(catalog: dict, **overrides) -> dict:
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


async def _seed_order(
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
) -> ProductionOrder:
    order = ProductionOrder(
        code=code,
        customer_id=customer_id,
        status=status,
        priority=priority,
        deadline=deadline,
        total_quantity=quantity,
        notes=notes,
    )
    order.items = [
        ProductionOrderItem(
            product_id=product_id or catalog["product"].id,
            quantity=quantity,
        )
    ]
    session.add(order)
    await session.commit()
    return order


async def test_create_order_without_customer_and_multiple_items(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await _login(client, "operator")

    response = await client.post(
        "/api/production-orders",
        json=_create_payload(
            catalog,
            customer_id=None,
            pic_id=str(users["operator"].id),
            priority="tinggi",
            notes="  Produksi stok internal  ",
            items=[
                {
                    "product_id": str(catalog["product"].id),
                    "quantity": 80,
                    "notes": " Panel depan ",
                },
                {
                    "product_id": str(catalog["second_product"].id),
                    "quantity": 40,
                },
            ],
        ),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["code"].startswith("PRD-")
    assert body["customer"] is None
    assert body["pic"]["id"] == str(users["operator"].id)
    assert body["status"] == "menunggu"
    assert body["priority"] == "tinggi"
    assert body["total_quantity"] == 120
    assert body["item_count"] == 2
    assert body["model_summary"] == "Jeans Slim Fit +1 model"
    assert body["notes"] == "Produksi stok internal"
    assert len(body["items"]) == 2
    assert body["items"][0]["notes"] == "Panel depan"
    assert len(body["status_history"]) == 1
    assert body["status_history"][0]["from_status"] is None
    assert body["status_history"][0]["to_status"] == "menunggu"
    assert body["status_history"][0]["changed_by"]["id"] == str(users["operator"].id)


async def test_create_order_rejects_invalid_items(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await _login(client)
    base_item = {
        "product_id": str(catalog["product"].id),
        "quantity": 10,
    }
    cases = [
        _create_payload(catalog, items=[]),
        _create_payload(catalog, items=[{**base_item, "quantity": 0}]),
        _create_payload(
            catalog,
            items=[{**base_item, "product_id": str(catalog["inactive_product"].id)}],
        ),
        _create_payload(catalog, items=[base_item, base_item]),
    ]

    for payload in cases:
        response = await client.post("/api/production-orders", json=payload)
        assert response.status_code == 422

    missing_product = await client.post(
        "/api/production-orders",
        json=_create_payload(
            catalog,
            items=[
                {
                    "product_id": "00000000-0000-0000-0000-000000000000",
                    "quantity": 5,
                }
            ],
        ),
    )
    assert missing_product.status_code == 422
    assert missing_product.json()["detail"] == (
        "Salah satu model produk tidak ditemukan atau tidak aktif."
    )


async def test_list_orders_supports_pagination_search_and_filters(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
    session: AsyncSession,
) -> None:
    statuses = [
        OrderStatus.MENUNGGU,
        OrderStatus.CUTTING,
        OrderStatus.JAHIT,
        OrderStatus.FINISHING,
        OrderStatus.QC,
        OrderStatus.SELESAI,
        OrderStatus.DIBATALKAN,
        OrderStatus.MENUNGGU,
    ]
    for index, status in enumerate(statuses, start=1):
        await _seed_order(
            session,
            catalog,
            code=f"PRD-2611-{index:03d}",
            status=status,
            priority=Priority.TINGGI if index % 2 == 0 else Priority.NORMAL,
            deadline=date(2026, 11, index),
            customer_id=(catalog["customer"].id if index <= 4 else None),
            product_id=(catalog["product"].id if index % 2 else catalog["second_product"].id),
            quantity=index * 10,
            notes="Pesanan khusus" if index == 8 else None,
        )

    await _login(client, "qc")

    first_page = await client.get("/api/production-orders?page=1&page_size=3")
    assert first_page.status_code == 200
    body = first_page.json()
    assert body["total"] == 8
    assert body["total_pages"] == 3
    assert len(body["items"]) == 3
    assert body["items"][0]["deadline"] == "2026-11-01"

    third_page = await client.get("/api/production-orders?page=3&page_size=3")
    assert len(third_page.json()["items"]) == 2

    by_customer = await client.get(
        "/api/production-orders",
        params={"search": "toko denim"},
    )
    assert by_customer.json()["total"] == 4

    by_model = await client.get(
        "/api/production-orders",
        params={"search": "straight"},
    )
    assert by_model.json()["total"] == 4

    by_code = await client.get(
        "/api/production-orders",
        params={"search": "PRD-2611-005"},
    )
    assert by_code.json()["total"] == 1
    assert by_code.json()["items"][0]["code"] == "PRD-2611-005"

    by_notes = await client.get(
        "/api/production-orders",
        params={"search": "khusus"},
    )
    assert by_notes.json()["total"] == 1

    by_status = await client.get(
        "/api/production-orders",
        params={"status": "cutting"},
    )
    assert by_status.json()["total"] == 1
    assert by_status.json()["items"][0]["status"] == "cutting"

    by_priority = await client.get(
        "/api/production-orders",
        params={"priority": "normal"},
    )
    assert by_priority.json()["total"] == 4

    by_customer_id = await client.get(
        "/api/production-orders",
        params={"customer_id": str(catalog["customer"].id)},
    )
    assert by_customer_id.json()["total"] == 4


async def test_detail_includes_items_timeline_and_logs(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
    session: AsyncSession,
) -> None:
    await _login(client, "operator")
    created = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )
    order_id = created.json()["id"]

    session.add(
        ProductionLog(
            production_order_id=UUID(order_id),
            stage=OrderStatus.CUTTING,
            log_date=date(2026, 11, 1),
            output_qty=30,
            reject_qty=1,
            notes="Cutting pagi.",
            created_by_id=users["operator"].id,
        )
    )
    session.add(
        OrderStatusHistory(
            production_order_id=UUID(order_id),
            from_status=OrderStatus.MENUNGGU,
            to_status=OrderStatus.CUTTING,
            changed_by_id=users["operator"].id,
            notes="Mulai cutting.",
        )
    )
    await session.commit()
    session.expire_all()

    detail = await client.get(f"/api/production-orders/{order_id}")

    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == order_id
    assert body["created_by"]["id"] == str(users["operator"].id)
    assert len(body["items"]) == 1
    assert body["items"][0]["product"]["code"] == "MDL-SLIM-32"
    assert body["items"][0]["quantity"] == 80
    assert [event["to_status"] for event in body["status_history"]] == [
        "menunggu",
        "cutting",
    ]
    assert body["production_logs"][0]["stage"] == "cutting"
    assert body["production_logs"][0]["output_qty"] == 30
    assert body["production_logs"][0]["created_by"]["name"] == "Raka Pratama"


async def test_update_header_and_replace_items(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await _login(client, "operator")
    created = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog, priority="tinggi"),
    )
    order_id = created.json()["id"]

    updated = await client.patch(
        f"/api/production-orders/{order_id}",
        json={
            "priority": "rendah",
            "deadline": "2026-11-15",
            "notes": "  Revisi pelanggan  ",
            "items": [
                {
                    "product_id": str(catalog["second_product"].id),
                    "quantity": 25,
                    "notes": "Ganti model",
                }
            ],
        },
    )

    assert updated.status_code == 200
    body = updated.json()
    assert body["priority"] == "rendah"
    assert body["deadline"] == "2026-11-15"
    assert body["notes"] == "Revisi pelanggan"
    assert body["total_quantity"] == 25
    assert body["item_count"] == 1
    assert body["items"][0]["product"]["code"] == "MDL-STRAIGHT-34"
    assert body["items"][0]["quantity"] == 25

    cleared = await client.patch(
        f"/api/production-orders/{order_id}",
        json={"customer_id": None, "pic_id": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["customer"] is None
    assert cleared.json()["pic"] is None

    empty = await client.patch(f"/api/production-orders/{order_id}", json={})
    assert empty.status_code == 422


async def test_archive_hides_order_but_keeps_record(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
    session: AsyncSession,
) -> None:
    await _login(client)
    created = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )
    order_id = UUID(created.json()["id"])
    code = created.json()["code"]

    archived = await client.delete(f"/api/production-orders/{order_id}")
    assert archived.status_code == 200
    assert archived.json()["message"] == "Perintah produksi berhasil diarsipkan."

    listed = await client.get("/api/production-orders")
    assert listed.json()["total"] == 0

    detail = await client.get(f"/api/production-orders/{order_id}")
    assert detail.status_code == 404
    assert detail.json()["detail"] == "Perintah produksi tidak ditemukan."

    twice = await client.delete(f"/api/production-orders/{order_id}")
    assert twice.status_code == 404

    stored = await session.scalar(select(ProductionOrder).where(ProductionOrder.id == order_id))
    assert stored is not None
    assert stored.deleted_at is not None
    assert stored.code == code

    replacement = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )
    assert replacement.status_code == 201
    assert replacement.json()["code"] != code


async def test_codes_are_sequential(client: AsyncClient, users, catalog) -> None:
    await _login(client)
    first = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )
    second = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )

    first_code = first.json()["code"]
    second_code = second.json()["code"]
    assert first_code.rsplit("-", 1)[0] == second_code.rsplit("-", 1)[0]
    assert int(second_code.rsplit("-", 1)[1]) == int(first_code.rsplit("-", 1)[1]) + 1


async def test_role_matrix_for_writes(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await _login(client, "qc")
    forbidden_create = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )
    assert forbidden_create.status_code == 403

    await _login(client, "operator")
    created = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )
    assert created.status_code == 201
    order_id = created.json()["id"]

    forbidden_delete = await client.delete(f"/api/production-orders/{order_id}")
    assert forbidden_delete.status_code == 403

    updated = await client.patch(
        f"/api/production-orders/{order_id}",
        json={"priority": "tinggi"},
    )
    assert updated.status_code == 200

    await _login(client, "qc")
    forbidden_update = await client.patch(
        f"/api/production-orders/{order_id}",
        json={"priority": "rendah"},
    )
    assert forbidden_update.status_code == 403

    await _login(client)
    allowed_delete = await client.delete(f"/api/production-orders/{order_id}")
    assert allowed_delete.status_code == 200


async def test_authentication_is_required(
    client: AsyncClient,
    catalog: dict,
) -> None:
    response = await client.get("/api/production-orders")
    assert response.status_code == 401

    created = await client.post(
        "/api/production-orders",
        json=_create_payload(catalog),
    )
    assert created.status_code == 401
