"""Pengujian header keamanan dan pemeriksaan origin."""

from httpx import AsyncClient


async def test_security_headers_are_present(client: AsyncClient) -> None:
    response = await client.get("/api/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in response.headers["permissions-policy"]


async def test_unsafe_request_from_unknown_origin_is_rejected(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "admin@sagara.co.id", "password": "KataSandiSalah#1"},
        headers={"Origin": "http://evil.example"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Origin permintaan tidak diizinkan."


async def test_unsafe_request_from_allowed_origin_reaches_handler(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "admin@sagara.co.id", "password": "KataSandiSalah#1"},
        headers={"Origin": "http://localhost:3000"},
    )

    assert response.status_code == 401
