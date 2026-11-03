"""Pengujian modul bahan, stok, dan matriks peran."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Material, StockMovement, StockMovementType
from tests.support import (
    login,
    material_payload,
    movement_payload,
    seed_material,
    seed_order,
)


@pytest.fixture
async def materials(session: AsyncSession) -> dict[str, Material]:
    """Bahan dengan seluruh status stok dan satu bahan nonaktif."""

    return {
        "habis": await seed_material(
            session,
            sku="MAT-HABIS",
            name="Bahan Habis",
            category="Kain",
            stock_qty="0",
            minimum_stock="10",
        ),
        "kritis": await seed_material(
            session,
            sku="MAT-KRITIS",
            name="Bahan Kritis",
            category="Benang",
            stock_qty="4",
            minimum_stock="10",
        ),
        "menipis": await seed_material(
            session,
            sku="MAT-MENIPIS",
            name="Bahan Menipis",
            category="Kain",
            stock_qty="8",
            minimum_stock="10",
        ),
        "aman": await seed_material(
            session,
            sku="MAT-AMAN",
            name="Bahan Aman",
            category="Kain",
            stock_qty="20",
            minimum_stock="10",
        ),
        "nonaktif": await seed_material(
            session,
            sku="MAT-NONAKTIF",
            name="Bahan Nonaktif",
            category="Aksesoris",
            stock_qty="5",
            minimum_stock="10",
            is_active=False,
        ),
    }


async def test_list_default_shows_active_materials_and_global_summary(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client)

    response = await client.get("/api/materials")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 4
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 1
    assert data["summary"] == {
        "total_active": 4,
        "out_of_stock": 1,
        "below_minimum": 2,
        "categories": ["Aksesoris", "Benang", "Kain"],
    }

    by_sku = {item["sku"]: item for item in data["items"]}
    assert "MAT-NONAKTIF" not in by_sku
    assert by_sku["MAT-HABIS"]["status"] == "habis"
    assert by_sku["MAT-KRITIS"]["status"] == "kritis"
    assert by_sku["MAT-MENIPIS"]["status"] == "menipis"
    assert by_sku["MAT-AMAN"]["status"] == "aman"
    assert by_sku["MAT-KRITIS"]["stock_qty"] == "4.00"
    assert by_sku["MAT-KRITIS"]["minimum_stock"] == "10.00"


async def test_active_filter_can_show_inactive_or_all(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client)

    inactive = await client.get("/api/materials", params={"active": "nonaktif"})
    assert inactive.status_code == 200
    assert [item["sku"] for item in inactive.json()["items"]] == ["MAT-NONAKTIF"]
    assert inactive.json()["summary"]["total_active"] == 4

    all_materials = await client.get("/api/materials", params={"active": "semua"})
    assert all_materials.status_code == 200
    assert all_materials.json()["total"] == 5


async def test_search_category_and_status_filters(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client)

    by_sku = await client.get("/api/materials", params={"search": "MAT-KRITIS"})
    assert [item["sku"] for item in by_sku.json()["items"]] == ["MAT-KRITIS"]

    by_name = await client.get("/api/materials", params={"search": "bahan habis"})
    assert [item["sku"] for item in by_name.json()["items"]] == ["MAT-HABIS"]

    by_category_search = await client.get("/api/materials", params={"search": "Benang"})
    assert [item["sku"] for item in by_category_search.json()["items"]] == ["MAT-KRITIS"]

    by_category = await client.get("/api/materials", params={"category": "Kain"})
    assert by_category.json()["total"] == 3

    for status_value, expected_sku in (
        ("habis", "MAT-HABIS"),
        ("kritis", "MAT-KRITIS"),
        ("menipis", "MAT-MENIPIS"),
        ("aman", "MAT-AMAN"),
    ):
        response = await client.get(
            "/api/materials",
            params={"stock_status": status_value},
        )
        assert response.status_code == 200
        assert [item["sku"] for item in response.json()["items"]] == [expected_sku]

    low_stock = await client.get("/api/materials", params={"low_stock": "true"})
    assert low_stock.status_code == 200
    assert low_stock.json()["total"] == 3
    assert low_stock.json()["summary"]["total_active"] == 4


async def test_pagination_uses_server_side_order(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client)

    response = await client.get(
        "/api/materials",
        params={"page": 2, "page_size": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    assert data["total_pages"] == 2
    assert [item["sku"] for item in data["items"]] == ["MAT-KRITIS", "MAT-MENIPIS"]


async def test_detail_status_minimum_zero_and_not_found(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    await login(client)
    empty = await seed_material(
        session,
        sku="MAT-MIN-NOL-HABIS",
        stock_qty="0",
        minimum_stock="0",
    )
    enough = await seed_material(
        session,
        sku="MAT-MIN-NOL-AMAN",
        stock_qty="5",
        minimum_stock="0",
    )

    empty_response = await client.get(f"/api/materials/{empty.id}")
    assert empty_response.status_code == 200
    assert empty_response.json()["status"] == "habis"
    assert empty_response.json()["movement_count"] == 0

    enough_response = await client.get(f"/api/materials/{enough.id}")
    assert enough_response.status_code == 200
    assert enough_response.json()["status"] == "aman"

    missing = await client.get(f"/api/materials/{uuid4()}")
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Bahan tidak ditemukan."


async def test_movement_history_order_filter_pagination_and_nulls(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    material = await seed_material(session, sku="MAT-RIWAYAT", stock_qty="20")
    now = datetime.now(UTC)

    session.add_all(
        [
            StockMovement(
                material_id=material.id,
                movement_type=StockMovementType.MASUK,
                quantity=Decimal("10"),
                stock_before=None,
                stock_after=None,
                note="Mutasi lama",
                created_at=now - timedelta(days=1),
            ),
            StockMovement(
                material_id=material.id,
                movement_type=StockMovementType.KELUAR,
                quantity=Decimal("5"),
                stock_before=Decimal("20"),
                stock_after=Decimal("15"),
                note="Mutasi baru",
                created_at=now,
            ),
        ]
    )
    await session.commit()
    await login(client)

    response = await client.get(f"/api/materials/{material.id}/movements")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["total_pages"] == 1
    assert data["items"][0]["movement_type"] == "keluar"
    assert data["items"][0]["stock_before"] == "20.00"
    assert data["items"][0]["stock_after"] == "15.00"
    assert data["items"][1]["stock_before"] is None
    assert data["items"][1]["stock_after"] is None

    filtered = await client.get(
        f"/api/materials/{material.id}/movements",
        params={"movement_type": "masuk"},
    )
    assert [item["note"] for item in filtered.json()["items"]] == ["Mutasi lama"]

    paged = await client.get(
        f"/api/materials/{material.id}/movements",
        params={"page": 2, "page_size": 1},
    )
    assert paged.json()["total_pages"] == 2
    assert [item["note"] for item in paged.json()["items"]] == ["Mutasi lama"]

    missing = await client.get(f"/api/materials/{uuid4()}/movements")
    assert missing.status_code == 404


async def test_admin_create_without_initial_stock(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")

    response = await client.post(
        "/api/materials",
        json=material_payload(sku=" mat-baru ", name=" Bahan Baru "),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["sku"] == "MAT-BARU"
    assert data["name"] == "Bahan Baru"
    assert data["stock_qty"] == "0.00"
    assert data["movement_count"] == 0

    history = await client.get(f"/api/materials/{data['id']}/movements")
    assert history.json()["total"] == 0


async def test_admin_create_with_initial_stock_records_movement(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")

    response = await client.post(
        "/api/materials",
        json=material_payload(
            sku="MAT-AWAL",
            initial_stock="20.00",
            minimum_stock="8.00",
        ),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["stock_qty"] == "20.00"
    assert data["movement_count"] == 1

    history = await client.get(f"/api/materials/{data['id']}/movements")
    item = history.json()["items"][0]
    assert item["movement_type"] == "masuk"
    assert item["quantity"] == "20.00"
    assert item["stock_before"] == "0.00"
    assert item["stock_after"] == "20.00"
    assert item["note"] == "Stok awal"
    assert item["created_by"]["name"] == "Admin Produksi"


async def test_create_rejects_duplicate_sku_and_stock_qty(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "admin")

    duplicate = await client.post(
        "/api/materials",
        json=material_payload(sku="mat-habis"),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "SKU bahan sudah digunakan."

    forbidden_field = await client.post(
        "/api/materials",
        json=material_payload(sku="MAT-STOK-LANGSUNG", stock_qty="5"),
    )
    assert forbidden_field.status_code == 422


async def test_create_forbidden_for_operator_and_qc(
    client: AsyncClient,
    users: dict,
) -> None:
    for role in ("operator", "qc"):
        await login(client, role)
        response = await client.post("/api/materials", json=material_payload())
        assert response.status_code == 403


async def test_admin_update_master_without_changing_stock(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "admin")
    material = materials["habis"]

    response = await client.patch(
        f"/api/materials/{material.id}",
        json={
            "name": " Bahan Habis Baru ",
            "category": "Benang",
            "minimum_stock": "12.50",
            "is_active": False,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Bahan Habis Baru"
    assert data["category"] == "Benang"
    assert data["minimum_stock"] == "12.50"
    assert data["stock_qty"] == "0.00"
    assert data["is_active"] is False


async def test_update_sku_and_unit_before_movement(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    material = await seed_material(
        session,
        sku="MAT-UBAH",
        stock_qty="5",
    )
    await login(client, "admin")

    response = await client.patch(
        f"/api/materials/{material.id}",
        json={"sku": " mat-ubah-baru ", "unit": "roll"},
    )
    assert response.status_code == 200
    assert response.json()["sku"] == "MAT-UBAH-BARU"
    assert response.json()["unit"] == "roll"


async def test_sku_and_unit_locked_after_movement(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")
    created = await client.post(
        "/api/materials",
        json=material_payload(sku="MAT-TERKUNCI", initial_stock="10"),
    )
    material_id = created.json()["id"]

    sku_response = await client.patch(
        f"/api/materials/{material_id}",
        json={"sku": "MAT-TERKUNCI-BARU"},
    )
    assert sku_response.status_code == 409
    assert sku_response.json()["detail"] == (
        "SKU dan satuan tidak dapat diubah setelah ada mutasi stok."
    )

    unit_response = await client.patch(
        f"/api/materials/{material_id}",
        json={"unit": "pcs"},
    )
    assert unit_response.status_code == 409

    name_response = await client.patch(
        f"/api/materials/{material_id}",
        json={"name": "Nama Tetap Boleh"},
    )
    assert name_response.status_code == 200


async def test_update_rejects_stock_qty_empty_payload_and_null(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "admin")
    material = materials["aman"]

    stock_qty = await client.patch(
        f"/api/materials/{material.id}",
        json={"stock_qty": "99.00"},
    )
    assert stock_qty.status_code == 422

    empty = await client.patch(f"/api/materials/{material.id}", json={})
    assert empty.status_code == 422

    null_field = await client.patch(
        f"/api/materials/{material.id}",
        json={"minimum_stock": None},
    )
    assert null_field.status_code == 422


async def test_update_forbidden_for_operator_and_qc(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    material = materials["aman"]
    for role in ("operator", "qc"):
        await login(client, role)
        response = await client.patch(
            f"/api/materials/{material.id}",
            json={"name": "Tidak Boleh"},
        )
        assert response.status_code == 403


async def test_admin_deactivate_and_reactivate_material(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "admin")
    material = materials["aman"]

    deactivate = await client.patch(
        f"/api/materials/{material.id}",
        json={"is_active": False},
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False
    assert deactivate.json()["stock_qty"] == "20.00"

    default_list = await client.get("/api/materials")
    assert "MAT-AMAN" not in {item["sku"] for item in default_list.json()["items"]}

    inactive_list = await client.get("/api/materials", params={"active": "nonaktif"})
    assert "MAT-AMAN" in {item["sku"] for item in inactive_list.json()["items"]}

    reactivate = await client.patch(
        f"/api/materials/{material.id}",
        json={"is_active": True},
    )
    assert reactivate.status_code == 200
    assert reactivate.json()["is_active"] is True


async def test_operator_cannot_deactivate_material(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "operator")
    response = await client.patch(
        f"/api/materials/{materials['aman'].id}",
        json={"is_active": False},
    )
    assert response.status_code == 403


async def test_stock_in_for_admin_and_operator(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    material = materials["aman"]

    await login(client, "admin")
    admin_response = await client.post(
        f"/api/materials/{material.id}/movements",
        json=movement_payload("masuk", quantity="5.00", note="Terima supplier"),
    )
    assert admin_response.status_code == 201
    assert admin_response.json()["stock_before"] == "20.00"
    assert admin_response.json()["stock_after"] == "25.00"

    await login(client, "operator")
    operator_response = await client.post(
        f"/api/materials/{material.id}/movements",
        json=movement_payload("masuk", quantity="2.50"),
    )
    assert operator_response.status_code == 201
    assert operator_response.json()["stock_before"] == "25.00"
    assert operator_response.json()["stock_after"] == "27.50"

    detail = await client.get(f"/api/materials/{material.id}")
    assert detail.json()["stock_qty"] == "27.50"
    assert detail.json()["movement_count"] == 2


async def test_qc_cannot_record_stock(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "qc")
    response = await client.post(
        f"/api/materials/{materials['aman'].id}/movements",
        json=movement_payload("masuk"),
    )
    assert response.status_code == 403


async def test_stock_out_valid_and_insufficient(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    material = materials["aman"]
    await login(client, "admin")

    success = await client.post(
        f"/api/materials/{material.id}/movements",
        json=movement_payload("keluar", quantity="5.00"),
    )
    assert success.status_code == 201
    assert success.json()["stock_before"] == "20.00"
    assert success.json()["stock_after"] == "15.00"

    insufficient = await client.post(
        f"/api/materials/{material.id}/movements",
        json=movement_payload("keluar", quantity="100.00"),
    )
    assert insufficient.status_code == 422
    assert insufficient.json()["detail"] == "Stok tidak cukup. Sisa stok 15 meter."

    detail = await client.get(f"/api/materials/{material.id}")
    assert detail.json()["stock_qty"] == "15.00"


async def test_adjustment_admin_only_and_no_change_rejected(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    material = materials["aman"]
    await login(client, "admin")

    higher = await client.post(
        f"/api/materials/{material.id}/movements",
        json=movement_payload("penyesuaian", target_stock="30", note="Stock opname"),
    )
    assert higher.status_code == 201
    assert higher.json()["quantity"] == "10.00"
    assert higher.json()["stock_before"] == "20.00"
    assert higher.json()["stock_after"] == "30.00"

    lower = await client.post(
        f"/api/materials/{material.id}/movements",
        json=movement_payload("penyesuaian", target_stock="12", note="Koreksi"),
    )
    assert lower.status_code == 201
    assert lower.json()["quantity"] == "18.00"
    assert lower.json()["stock_after"] == "12.00"

    unchanged = await client.post(
        f"/api/materials/{material.id}/movements",
        json=movement_payload("penyesuaian", target_stock="12", note="Koreksi"),
    )
    assert unchanged.status_code == 422
    assert unchanged.json()["detail"] == "Stok tidak berubah."

    detail = await client.get(f"/api/materials/{material.id}")
    assert detail.json()["stock_qty"] == "12.00"


async def test_adjustment_forbidden_for_operator_and_qc(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    for role in ("operator", "qc"):
        await login(client, role)
        response = await client.post(
            f"/api/materials/{materials['aman'].id}/movements",
            json=movement_payload("penyesuaian"),
        )
        assert response.status_code == 403


async def test_movement_on_inactive_material_rejected(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "admin")
    response = await client.post(
        f"/api/materials/{materials['nonaktif'].id}/movements",
        json=movement_payload("masuk"),
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Bahan nonaktif tidak dapat menerima mutasi stok."


async def test_invalid_movement_payloads(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    await login(client, "admin")
    material = materials["aman"]

    for payload in (
        movement_payload("masuk", quantity="0"),
        movement_payload("masuk", quantity="-1"),
        movement_payload("masuk", quantity="1.234"),
        {"movement_type": "masuk"},
        {"movement_type": "masuk", "quantity": "5", "target_stock": "8"},
        movement_payload("penyesuaian", target_stock="-1"),
        {"movement_type": "penyesuaian", "target_stock": "8"},
        {
            "movement_type": "penyesuaian",
            "target_stock": "8",
            "note": "ab",
        },
    ):
        response = await client.post(
            f"/api/materials/{material.id}/movements",
            json=payload,
        )
        assert response.status_code == 422, payload


async def test_stock_out_can_link_production_order(
    client: AsyncClient,
    users: dict,
    catalog: dict,
    session: AsyncSession,
    materials: dict[str, Material],
) -> None:
    order = await seed_order(session, catalog, code="PRD-UJI-001")
    await login(client, "operator")

    response = await client.post(
        f"/api/materials/{materials['aman'].id}/movements",
        json=movement_payload(
            "keluar",
            quantity="5.00",
            production_order_id=str(order.id),
        ),
    )
    assert response.status_code == 201
    assert response.json()["production_order"] == {
        "id": str(order.id),
        "code": "PRD-UJI-001",
    }

    history = await client.get(f"/api/materials/{materials['aman'].id}/movements")
    assert history.json()["items"][0]["production_order"]["code"] == "PRD-UJI-001"


async def test_production_order_link_only_for_stock_out(
    client: AsyncClient,
    users: dict,
    catalog: dict,
    session: AsyncSession,
    materials: dict[str, Material],
) -> None:
    order = await seed_order(session, catalog, code="PRD-UJI-002")
    await login(client, "admin")
    order_id = str(order.id)
    material_id = materials["aman"].id

    for payload in (
        movement_payload("masuk", production_order_id=order_id),
        movement_payload("penyesuaian", production_order_id=order_id),
    ):
        response = await client.post(
            f"/api/materials/{material_id}/movements",
            json=payload,
        )
        assert response.status_code == 422

    missing_order = await client.post(
        f"/api/materials/{material_id}/movements",
        json=movement_payload("keluar", production_order_id=str(uuid4())),
    )
    assert missing_order.status_code == 422
    assert missing_order.json()["detail"] == (
        "Perintah produksi tidak ditemukan atau sudah diarsipkan."
    )

    order.deleted_at = datetime.now(UTC)
    await session.commit()

    archived = await client.post(
        f"/api/materials/{material_id}/movements",
        json=movement_payload("keluar", production_order_id=order_id),
    )
    assert archived.status_code == 422


async def test_read_endpoints_available_to_all_roles(
    client: AsyncClient,
    users: dict,
    materials: dict[str, Material],
) -> None:
    material_id = materials["kritis"].id

    for role in ("admin", "operator", "qc"):
        await login(client, role)

        listing = await client.get("/api/materials")
        assert listing.status_code == 200

        detail = await client.get(f"/api/materials/{material_id}")
        assert detail.status_code == 200

        history = await client.get(f"/api/materials/{material_id}/movements")
        assert history.status_code == 200

        inactive = await client.get(
            "/api/materials",
            params={"active": "nonaktif"},
        )
        assert inactive.status_code == 200
