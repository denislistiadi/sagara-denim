"""Pengujian data master dan opsi PIC."""

from httpx import AsyncClient

from app.config import get_settings
from app.models import User

settings = get_settings()


async def _login(client: AsyncClient, role: str = "qc") -> None:
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


async def test_master_data_requires_login(client: AsyncClient, catalog: dict) -> None:
    for path in ("/api/customers", "/api/products", "/api/users/options"):
        response = await client.get(path)
        assert response.status_code == 401


async def test_all_roles_can_read_master_data(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await _login(client, "qc")

    customers = await client.get("/api/customers")
    assert customers.status_code == 200
    body = customers.json()
    assert body["total"] == 2
    assert [item["name"] for item in body["items"]] == [
        "Butik Rasa",
        "Toko Denim Jaya",
    ]
    assert all(item["code"] != "CUST-003" for item in body["items"])

    products = await client.get("/api/products")
    assert products.status_code == 200
    product_body = products.json()
    assert product_body["total"] == 2
    assert product_body["items"][0]["size"] is not None
    assert all(item["code"] != "MDL-ARCHIVE-40" for item in product_body["items"])

    options = await client.get("/api/users/options")
    assert options.status_code == 200
    option_body = options.json()
    assert option_body["total"] == 3
    assert {item["role"] for item in option_body["items"]} == {
        "admin",
        "operator",
        "qc",
    }
    assert all("email" not in item for item in option_body["items"])

    # Daftar pengguna lengkap tetap khusus admin.
    assert (await client.get("/api/users")).status_code == 403


async def test_master_data_supports_search(
    client: AsyncClient,
    users: dict[str, User],
    catalog: dict,
) -> None:
    await _login(client, "operator")

    customers = await client.get("/api/customers", params={"search": "toko"})
    assert customers.json()["total"] == 1
    assert customers.json()["items"][0]["code"] == "CUST-001"

    products = await client.get("/api/products", params={"search": "straight"})
    assert products.json()["total"] == 1
    assert products.json()["items"][0]["code"] == "MDL-STRAIGHT-34"
