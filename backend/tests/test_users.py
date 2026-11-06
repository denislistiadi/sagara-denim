"""Pengujian CRUD pengguna dan keamanan sesi."""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import generate_refresh_token, hash_refresh_token
from app.models import RefreshToken, User
from tests.support import login

settings = get_settings()


def user_payload(**overrides) -> dict:
    """Payload pengguna standar untuk pengujian."""

    payload = {
        "email": "operator.baru@sagara.co.id",
        "name": "Operator Baru",
        "role": "operator",
        "password": "sandiAman123",
    }
    payload.update(overrides)
    return payload


def reset_payload(password: str = "sandiBaru456") -> dict:
    return {"new_password": password}


async def _seed_token(session: AsyncSession, user_id) -> RefreshToken:
    """Buat refresh token aktif untuk menguji pencabutan."""

    token = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(generate_refresh_token()),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(token)
    await session.commit()
    return token


async def _revoked_token(session: AsyncSession, token_id) -> RefreshToken:
    token = await session.get(RefreshToken, token_id, populate_existing=True)
    assert token is not None
    return token


async def test_user_management_requires_admin(
    client: AsyncClient,
    users: dict,
    catalog: dict,
) -> None:
    target_id = str(users["operator"].id)
    operator_id = str(users["operator"].id)

    for role in ("operator", "qc"):
        await login(client, role)
        assert (await client.get("/api/users")).status_code == 403
        assert (
            await client.post("/api/users", json=user_payload())
        ).status_code == 403
        assert (
            await client.patch(
                f"/api/users/{target_id}",
                json={"name": "Diubah"},
            )
        ).status_code == 403
        assert (
            await client.post(
                f"/api/users/{target_id}/reset-password",
                json=reset_payload(),
            )
        ).status_code == 403
        assert (
            await client.delete(f"/api/users/{target_id}")
        ).status_code == 403
        options = await client.get("/api/users/options")
        assert options.status_code == 200
        assert operator_id in {item["id"] for item in options.json()["items"]}


async def test_list_users_filters_search_and_pagination(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")

    active = await client.get("/api/users", params={"page_size": 100})
    assert active.status_code == 200
    body = active.json()
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["page_size"] == 100
    assert body["total_pages"] == 1
    assert [item["name"] for item in body["items"]] == [
        "Admin Produksi",
        "Raka Pratama",
        "Sinta Maharani",
    ]
    assert all(item["is_active"] is True for item in body["items"])

    search = await client.get("/api/users", params={"search": "sinta"})
    assert search.status_code == 200
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["role"] == "qc"

    first = await client.get("/api/users", params={"page_size": 2})
    assert first.status_code == 200
    assert first.json()["total_pages"] == 2
    assert len(first.json()["items"]) == 2

    second = await client.get("/api/users", params={"page_size": 2, "page": 2})
    assert second.status_code == 200
    assert len(second.json()["items"]) == 1

    users["operator"].is_active = False
    await client.patch(
        f"/api/users/{users['operator'].id}",
        json={"is_active": False},
    )
    inactive = await client.get("/api/users", params={"active": "nonaktif"})
    assert inactive.status_code == 200
    assert [item["email"] for item in inactive.json()["items"]] == [
        settings.seed_operator_email,
    ]

    all_users = await client.get(
        "/api/users",
        params={"active": "semua", "page_size": 100},
    )
    assert all_users.json()["total"] == 3


async def test_create_user_and_duplicate_email(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")

    created = await client.post(
        "/api/users",
        json=user_payload(email="  Operator.Baru@Sagara.co.id  ", name="  Operator Baru  "),
    )
    assert created.status_code == 201
    body = created.json()
    assert body["email"] == "operator.baru@sagara.co.id"
    assert body["name"] == "Operator Baru"
    assert body["role"] == "operator"
    assert body["is_active"] is True

    duplicate = await client.post(
        "/api/users",
        json=user_payload(email="OPERATOR.BARU@sagara.co.id"),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Email pengguna sudah digunakan."

    login_baru = await client.post(
        "/api/auth/login",
        json={
            "email": "operator.baru@sagara.co.id",
            "password": "sandiAman123",
        },
    )
    assert login_baru.status_code == 200


async def test_create_user_password_policy(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")

    for password in ("pendek1", "hanyahuruf", "12345678"):
        response = await client.post(
            "/api/users",
            json=user_payload(password=password),
        )
        assert response.status_code == 422, password

    missing = await client.post(
        "/api/users",
        json={key: value for key, value in user_payload().items() if key != "password"},
    )
    assert missing.status_code == 422


async def test_update_user_and_self_protection(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    await login(client, "admin")
    operator_id = str(users["operator"].id)
    admin_id = str(users["admin"].id)

    updated = await client.patch(
        f"/api/users/{operator_id}",
        json={
            "email": "raka.baru@sagara.co.id",
            "name": "Raka Diubah",
            "role": "qc",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["email"] == "raka.baru@sagara.co.id"
    assert updated.json()["name"] == "Raka Diubah"
    assert updated.json()["role"] == "qc"

    duplicate = await client.patch(
        f"/api/users/{operator_id}",
        json={"email": settings.seed_qc_email},
    )
    assert duplicate.status_code == 409

    empty = await client.patch(f"/api/users/{operator_id}", json={})
    assert empty.status_code == 422

    self_deactivate = await client.patch(
        f"/api/users/{admin_id}",
        json={"is_active": False},
    )
    assert self_deactivate.status_code == 409

    self_role = await client.patch(
        f"/api/users/{admin_id}",
        json={"role": "operator"},
    )
    assert self_role.status_code == 409

    stored = await session.get(User, users["operator"].id, populate_existing=True)
    assert stored is not None
    assert stored.role.value == "qc"


async def test_deactivation_revokes_tokens_and_blocks_login(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    token = await _seed_token(session, users["operator"].id)
    await login(client, "admin")

    response = await client.delete(f"/api/users/{users['operator'].id}")
    assert response.status_code == 204

    stored_user = await session.get(
        User,
        users["operator"].id,
        populate_existing=True,
    )
    assert stored_user is not None
    assert stored_user.is_active is False

    stored_token = await _revoked_token(session, token.id)
    assert stored_token.revoked_at is not None
    assert stored_token.revoked_reason == "user_deactivated"

    blocked = await client.post(
        "/api/auth/login",
        json={
            "email": settings.seed_operator_email,
            "password": settings.seed_operator_password,
        },
    )
    assert blocked.status_code == 401

    self_delete = await client.delete(f"/api/users/{users['admin'].id}")
    assert self_delete.status_code == 409


async def test_role_change_revokes_tokens(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    token = await _seed_token(session, users["operator"].id)
    await login(client, "admin")

    response = await client.patch(
        f"/api/users/{users['operator'].id}",
        json={"role": "qc"},
    )
    assert response.status_code == 200

    stored_token = await _revoked_token(session, token.id)
    assert stored_token.revoked_at is not None
    assert stored_token.revoked_reason == "role_changed"


async def test_reset_password_revokes_tokens_and_uses_new_password(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    token = await _seed_token(session, users["operator"].id)
    await login(client, "admin")

    invalid = await client.post(
        f"/api/users/{users['operator'].id}/reset-password",
        json=reset_payload("pendek1"),
    )
    assert invalid.status_code == 422

    response = await client.post(
        f"/api/users/{users['operator'].id}/reset-password",
        json=reset_payload(),
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Kata sandi berhasil direset."

    stored_token = await _revoked_token(session, token.id)
    assert stored_token.revoked_at is not None
    assert stored_token.revoked_reason == "password_reset"

    old_login = await client.post(
        "/api/auth/login",
        json={
            "email": settings.seed_operator_email,
            "password": settings.seed_operator_password,
        },
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/auth/login",
        json={
            "email": settings.seed_operator_email,
            "password": "sandiBaru456",
        },
    )
    assert new_login.status_code == 200


async def test_reset_own_password_allowed_and_revokes_tokens(
    client: AsyncClient,
    users: dict,
    session: AsyncSession,
) -> None:
    token = await _seed_token(session, users["admin"].id)
    await login(client, "admin")

    response = await client.post(
        f"/api/users/{users['admin'].id}/reset-password",
        json=reset_payload(),
    )
    assert response.status_code == 200

    stored_token = await _revoked_token(session, token.id)
    assert stored_token.revoked_at is not None
    assert stored_token.revoked_reason == "password_reset"


async def test_user_not_found(
    client: AsyncClient,
    users: dict,
) -> None:
    await login(client, "admin")
    missing_id = "00000000-0000-0000-0000-000000000000"

    assert (
        await client.patch(f"/api/users/{missing_id}", json={"name": "Tidak Ada"})
    ).status_code == 404
    assert (
        await client.post(
            f"/api/users/{missing_id}/reset-password",
            json=reset_payload(),
        )
    ).status_code == 404
    assert (await client.delete(f"/api/users/{missing_id}")).status_code == 404


async def test_refresh_token_rows_are_unique(
    session: AsyncSession,
    users: dict,
) -> None:
    """Pastikan helper token pengujian tidak bentrok dengan token lain."""

    first = await _seed_token(session, users["operator"].id)
    second = await _seed_token(session, users["operator"].id)

    rows = (
        await session.scalars(
            select(RefreshToken).where(RefreshToken.user_id == users["operator"].id)
        )
    ).all()
    assert {row.id for row in rows} == {first.id, second.id}
