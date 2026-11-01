"""Pengujian login, refresh, logout, dan otorisasi peran."""

from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app

settings = get_settings()


async def _login(
    client: AsyncClient,
    *,
    email: str | None = None,
    password: str | None = None,
):
    return await client.post(
        "/api/auth/login",
        json={
            "email": email or settings.seed_admin_email,
            "password": password or settings.seed_admin_password,
        },
    )


def _cookie_header(response, name: str) -> str:
    return response.cookies.get(name)


async def test_login_sets_httponly_cookies(client, users) -> None:
    response = await _login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == settings.seed_admin_email
    assert body["user"]["role"] == "admin"
    assert "password_hash" not in body["user"]

    assert settings.access_cookie_name in response.cookies
    assert settings.refresh_cookie_name in response.cookies

    set_cookie = " ".join(response.headers.get_list("set-cookie")).lower()
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie


async def test_login_rejects_wrong_password(client, users) -> None:
    response = await _login(client, password="KataSandiSalah#1")

    assert response.status_code == 401
    assert response.json()["detail"] == "Email atau kata sandi salah."


async def test_me_requires_session(client, users) -> None:
    unauthorized = await client.get("/api/auth/me")
    assert unauthorized.status_code == 401

    await _login(client)
    response = await client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == settings.seed_admin_email


async def test_me_accepts_bearer_token(client, users) -> None:
    login = await _login(client)
    access_token = _cookie_header(login, settings.access_cookie_name)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as fresh:
        response = await fresh.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    assert response.status_code == 200
    assert response.json()["email"] == settings.seed_admin_email


async def test_refresh_rotates_token_and_detects_reuse(client, users) -> None:
    login = await _login(client)
    old_refresh = _cookie_header(login, settings.refresh_cookie_name)

    refreshed = await client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    new_refresh = _cookie_header(refreshed, settings.refresh_cookie_name)
    assert new_refresh != old_refresh

    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as reuser:
        reuser.cookies.set(settings.refresh_cookie_name, old_refresh)
        reuse = await reuser.post("/api/auth/refresh")
    assert reuse.status_code == 401

    # Pemakaian ulang mencabut seluruh sesi aktif, termasuk token terbaru.
    async with AsyncClient(transport=transport, base_url="http://test") as fresh:
        fresh.cookies.set(settings.refresh_cookie_name, new_refresh)
        revoked = await fresh.post("/api/auth/refresh")
    assert revoked.status_code == 401


async def test_logout_revokes_refresh_token(client, users) -> None:
    login = await _login(client)
    refresh_token = _cookie_header(login, settings.refresh_cookie_name)

    logout = await client.post("/api/auth/logout")
    assert logout.status_code == 200
    assert logout.json()["message"] == "Logout berhasil."

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as fresh:
        fresh.cookies.set(settings.refresh_cookie_name, refresh_token)
        response = await fresh.post("/api/auth/refresh")

    assert response.status_code == 401


async def test_admin_can_list_users(client, users) -> None:
    await _login(client)
    response = await client.get("/api/users")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert {user["role"] for user in body["items"]} == {"admin", "operator", "qc"}
    assert all("password_hash" not in user for user in body["items"])


async def test_operator_cannot_list_users(client, users) -> None:
    await _login(
        client,
        email=settings.seed_operator_email,
        password=settings.seed_operator_password,
    )
    response = await client.get("/api/users")

    assert response.status_code == 403
    assert response.json()["detail"] == ("Anda tidak memiliki akses ke sumber daya ini.")
