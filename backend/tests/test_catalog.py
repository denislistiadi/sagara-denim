"""Pengujian CRUD data master pelanggan dan produk."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, Product
from tests.support import login


def customer_payload(**overrides) -> dict:
    """Payload pelanggan standar untuk pengujian."""

    payload = {
        "code": "cust-100",
        "name": "Pelanggan Baru",
        "phone": "0812-0000-0001",
        "email": "pelanggan@example.com",
        "address": "Bandung",
    }
    payload.update(overrides)
    return payload


def product_payload(**overrides) -> dict:
    """Payload produk standar untuk pengujian."""

    payload = {
        "code": "mdl-100",
        "name": "Jeans Baru",
        "size": "32",
        "color": "Indigo",
        "description": "Model uji",
    }
    payload.update(overrides)
    return payload


async def test_catalog_requires_login(client: AsyncClient, catalog: dict) -> None:
    customer_id = str(catalog["customer"].id)
    product_id = str(catalog["product"].id)

    requests = [
        ("get", "/api/customers", None),
        ("get", f"/api/customers/{customer_id}", None),
        ("post", "/api/customers", customer_payload()),
        ("patch", f"/api/customers/{customer_id}", {"name": "Baru"}),
        ("delete", f"/api/customers/{customer_id}", None),
        ("get", "/api/products", None),
        ("get", f"/api/products/{product_id}", None),
        ("post", "/api/products", product_payload()),
        ("patch", f"/api/products/{product_id}", {"name": "Baru"}),
        ("delete", f"/api/products/{product_id}", None),
    ]

    for method, path, body in requests:
        response = await getattr(client, method)(
            path,
            **({"json": body} if body is not None else {}),
        )
        assert response.status_code == 401, (method, path)


async def test_catalog_read_allowed_for_all_roles(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    customer_id = str(catalog["customer"].id)
    product_id = str(catalog["product"].id)

    for role in ("admin", "operator", "qc"):
        await login(client, role)
        assert (await client.get("/api/customers")).status_code == 200
        assert (await client.get(f"/api/customers/{customer_id}")).status_code == 200
        assert (await client.get("/api/products")).status_code == 200
        assert (await client.get(f"/api/products/{product_id}")).status_code == 200


async def test_catalog_write_forbidden_for_non_admin(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    customer_id = str(catalog["customer"].id)
    product_id = str(catalog["product"].id)

    for role in ("operator", "qc"):
        await login(client, role)
        assert (
            await client.post("/api/customers", json=customer_payload())
        ).status_code == 403
        assert (
            await client.patch(
                f"/api/customers/{customer_id}",
                json={"name": "Diubah"},
            )
        ).status_code == 403
        assert (
            await client.delete(f"/api/customers/{customer_id}")
        ).status_code == 403
        assert (
            await client.post("/api/products", json=product_payload())
        ).status_code == 403
        assert (
            await client.patch(
                f"/api/products/{product_id}",
                json={"name": "Diubah"},
            )
        ).status_code == 403
        assert (
            await client.delete(f"/api/products/{product_id}")
        ).status_code == 403


async def test_customer_list_default_active_and_status_filters(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    await login(client, "operator")

    active = await client.get("/api/customers", params={"page_size": 100})
    assert active.status_code == 200
    body = active.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["page_size"] == 100
    assert body["total_pages"] == 1
    assert [item["name"] for item in body["items"]] == [
        "Butik Rasa",
        "Toko Denim Jaya",
    ]
    assert all(item["is_active"] is True for item in body["items"])

    inactive = await client.get("/api/customers", params={"active": "nonaktif"})
    assert inactive.status_code == 200
    assert [item["code"] for item in inactive.json()["items"]] == ["CUST-003"]

    all_customers = await client.get(
        "/api/customers",
        params={"active": "semua", "page_size": 100},
    )
    assert all_customers.status_code == 200
    assert all_customers.json()["total"] == 3


async def test_customer_list_search_and_pagination(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    await login(client, "admin")

    response = await client.get(
        "/api/customers",
        params={"search": "toko", "page_size": 100},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["code"] == "CUST-001"

    first = await client.get("/api/customers", params={"page_size": 1})
    assert first.status_code == 200
    assert first.json()["total"] == 2
    assert first.json()["total_pages"] == 2
    assert len(first.json()["items"]) == 1

    second = await client.get(
        "/api/customers",
        params={"page_size": 1, "page": 2},
    )
    assert second.status_code == 200
    assert len(second.json()["items"]) == 1
    assert second.json()["items"][0]["id"] != first.json()["items"][0]["id"]


async def test_create_customer_normalizes_and_hides_empty_optionals(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")

    response = await client.post(
        "/api/customers",
        json=customer_payload(
            code="  cust-100  ",
            name="  Pelanggan Baru  ",
            phone="  ",
            email="",
            address="   ",
        ),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["code"] == "CUST-100"
    assert body["name"] == "Pelanggan Baru"
    assert body["phone"] is None
    assert body["email"] is None
    assert body["address"] is None
    assert body["is_active"] is True
    assert body["created_at"] is not None
    assert body["updated_at"] is not None


async def test_create_customer_rejects_duplicate_code_case_insensitive(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    await login(client, "admin")

    response = await client.post(
        "/api/customers",
        json=customer_payload(code="cust-001"),
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Kode pelanggan sudah digunakan."


async def test_update_customer_and_clear_optional_fields(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    await login(client, "admin")
    customer_id = str(catalog["customer"].id)

    response = await client.patch(
        f"/api/customers/{customer_id}",
        json={
            "code": "cust-001-baru",
            "name": "Toko Denim Baru",
            "phone": None,
            "email": None,
            "address": None,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "CUST-001-BARU"
    assert body["name"] == "Toko Denim Baru"
    assert body["phone"] is None
    assert body["email"] is None
    assert body["address"] is None


async def test_update_customer_rejects_duplicate_code_and_empty_payload(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    await login(client, "admin")
    customer_id = str(catalog["customer"].id)

    duplicate = await client.patch(
        f"/api/customers/{customer_id}",
        json={"code": "cust-002"},
    )
    assert duplicate.status_code == 409

    empty = await client.patch(f"/api/customers/{customer_id}", json={})
    assert empty.status_code == 422

    null_name = await client.patch(
        f"/api/customers/{customer_id}",
        json={"name": None},
    )
    assert null_name.status_code == 422

    missing = await client.patch(
        "/api/customers/00000000-0000-0000-0000-000000000000",
        json={"name": "Tidak Ada"},
    )
    assert missing.status_code == 404


async def test_deactivate_customer_is_soft_delete(
    client: AsyncClient,
    users: dict,
    catalog: dict,
    session: AsyncSession,
) -> None:
    await login(client, "admin")
    customer_id = str(catalog["customer"].id)

    response = await client.delete(f"/api/customers/{customer_id}")
    assert response.status_code == 204

    detail = await client.get(f"/api/customers/{customer_id}")
    assert detail.status_code == 200
    assert detail.json()["is_active"] is False

    default_list = await client.get("/api/customers", params={"page_size": 100})
    assert all(item["id"] != customer_id for item in default_list.json()["items"])

    nonaktif = await client.get(
        "/api/customers",
        params={"active": "nonaktif", "page_size": 100},
    )
    assert any(item["id"] == customer_id for item in nonaktif.json()["items"])

    stored = await session.get(Customer, catalog["customer"].id)
    assert stored is not None
    assert stored.is_active is False

    # Nonaktifkan ulang bersifat idempoten.
    assert (await client.delete(f"/api/customers/{customer_id}")).status_code == 204


async def test_customer_validation(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")

    invalid_email = await client.post(
        "/api/customers",
        json=customer_payload(email="bukan-email"),
    )
    assert invalid_email.status_code == 422

    blank_code = await client.post(
        "/api/customers",
        json=customer_payload(code="   "),
    )
    assert blank_code.status_code == 422

    extra_field = await client.post(
        "/api/customers",
        json=customer_payload(unknown="x"),
    )
    assert extra_field.status_code == 422


async def test_product_list_filters_and_search(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    await login(client, "qc")

    active = await client.get("/api/products", params={"page_size": 100})
    assert active.status_code == 200
    body = active.json()
    assert body["total"] == 2
    assert [item["name"] for item in body["items"]] == [
        "Jeans Slim Fit",
        "Jeans Straight",
    ]
    assert all(item["is_active"] is True for item in body["items"])

    inactive = await client.get("/api/products", params={"active": "nonaktif"})
    assert [item["code"] for item in inactive.json()["items"]] == ["MDL-ARCHIVE-40"]

    all_products = await client.get(
        "/api/products",
        params={"active": "semua", "page_size": 100},
    )
    assert all_products.json()["total"] == 3

    search = await client.get("/api/products", params={"search": "straight"})
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["code"] == "MDL-STRAIGHT-34"


async def test_create_update_deactivate_product(
    client: AsyncClient,
    users: dict,
    catalog: dict,
    session: AsyncSession,
) -> None:
    await login(client, "admin")

    created = await client.post(
        "/api/products",
        json=product_payload(code="  mdl-100  ", color="  "),
    )
    assert created.status_code == 201
    body = created.json()
    assert body["code"] == "MDL-100"
    assert body["color"] is None
    product_id = body["id"]

    duplicate = await client.post(
        "/api/products",
        json=product_payload(code="mdl-slim-32"),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Kode produk sudah digunakan."

    updated = await client.patch(
        f"/api/products/{product_id}",
        json={
            "code": "mdl-101",
            "name": "Jeans Baru Diubah",
            "size": None,
            "description": None,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["code"] == "MDL-101"
    assert updated.json()["name"] == "Jeans Baru Diubah"
    assert updated.json()["size"] is None
    assert updated.json()["description"] is None

    duplicate_update = await client.patch(
        f"/api/products/{product_id}",
        json={"code": "mdl-straight-34"},
    )
    assert duplicate_update.status_code == 409

    empty = await client.patch(f"/api/products/{product_id}", json={})
    assert empty.status_code == 422

    deleted = await client.delete(f"/api/products/{product_id}")
    assert deleted.status_code == 204

    detail = await client.get(f"/api/products/{product_id}")
    assert detail.status_code == 200
    assert detail.json()["is_active"] is False

    stored = await session.get(Product, product_id)
    assert stored is not None
    assert stored.is_active is False


async def test_product_not_found(client: AsyncClient, users: dict) -> None:
    await login(client, "admin")
    missing_id = "00000000-0000-0000-0000-000000000000"

    assert (await client.get(f"/api/products/{missing_id}")).status_code == 404
    assert (
        await client.patch(f"/api/products/{missing_id}", json={"name": "X"})
    ).status_code == 404
    assert (await client.delete(f"/api/products/{missing_id}")).status_code == 404
