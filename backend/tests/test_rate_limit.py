"""Pengujian rate limit login berbasis PostgreSQL."""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.models import LoginAttempt
from app.services.rate_limit import PostgresLoginRateLimiter

settings = get_settings()


def _limiter(email_limit: int = 3, ip_limit: int = 2) -> PostgresLoginRateLimiter:
    return PostgresLoginRateLimiter(
        Settings(
            environment="test",
            jwt_secret="x" * 32,
            login_max_failures_email=email_limit,
            login_max_failures_ip=ip_limit,
            login_window_minutes=15,
            login_block_minutes=15,
            _env_file=None,
        )
    )


async def test_email_failure_blocks_after_limit(session: AsyncSession) -> None:
    limiter = _limiter()

    for _ in range(3):
        await limiter.record_failure(session, email="Admin@Sagara.co.id", ip=None)
    await session.commit()

    block = await limiter.check(session, email="admin@sagara.co.id", ip=None)

    assert block is not None
    assert block.scope == "email"
    assert 0 < block.retry_after_seconds <= 15 * 60


async def test_successful_login_clears_failures(session: AsyncSession) -> None:
    limiter = _limiter(email_limit=3)

    for _ in range(2):
        await limiter.record_failure(session, email="admin@sagara.co.id", ip=None)

    await limiter.clear(
        session,
        email="admin@sagara.co.id",
        ip=None,
    )
    await session.commit()

    assert await limiter.check(session, email="admin@sagara.co.id", ip=None) is None


async def test_ip_scope_blocks_across_different_emails(session: AsyncSession) -> None:
    limiter = _limiter(email_limit=5, ip_limit=2)

    for index in range(2):
        await limiter.record_failure(
            session,
            email=f"user{index}@sagara.co.id",
            ip="203.0.113.10",
        )
    await session.commit()

    block = await limiter.check(
        session,
        email="lain@sagara.co.id",
        ip="203.0.113.10",
    )

    assert block is not None
    assert block.scope == "ip"


async def test_expired_block_is_ignored(session: AsyncSession) -> None:
    limiter = _limiter(email_limit=2)

    for _ in range(2):
        await limiter.record_failure(session, email="admin@sagara.co.id", ip=None)
    await session.commit()

    past = datetime.now(UTC) - timedelta(minutes=1)
    await session.execute(
        update(LoginAttempt)
        .where(LoginAttempt.scope == "email")
        .values(expires_at=past, blocked_until=past)
    )
    await session.commit()

    assert await limiter.check(session, email="admin@sagara.co.id", ip=None) is None


async def test_login_returns_429_with_retry_after(client: AsyncClient, users) -> None:
    for _ in range(settings.login_max_failures_email):
        response = await client.post(
            "/api/auth/login",
            json={
                "email": settings.seed_admin_email,
                "password": "KataSandiSalah#1",
            },
        )
        assert response.status_code == 401

    blocked = await client.post(
        "/api/auth/login",
        json={
            "email": settings.seed_admin_email,
            "password": settings.seed_admin_password,
        },
    )

    assert blocked.status_code == 429
    assert blocked.json()["detail"] == (
        "Terlalu banyak percobaan masuk. Silakan coba lagi nanti."
    )
    assert int(blocked.headers["retry-after"]) > 0


async def test_login_success_resets_email_counter(client: AsyncClient, users) -> None:
    wrong = {"email": settings.seed_admin_email, "password": "KataSandiSalah#1"}
    correct = {
        "email": settings.seed_admin_email,
        "password": settings.seed_admin_password,
    }

    for _ in range(settings.login_max_failures_email - 1):
        assert (await client.post("/api/auth/login", json=wrong)).status_code == 401

    assert (await client.post("/api/auth/login", json=correct)).status_code == 200

    for _ in range(settings.login_max_failures_email - 1):
        assert (await client.post("/api/auth/login", json=wrong)).status_code == 401

    assert (await client.post("/api/auth/login", json=correct)).status_code == 200


async def test_unlock_removes_block(session: AsyncSession) -> None:
    limiter = _limiter(email_limit=2)

    for _ in range(2):
        await limiter.record_failure(session, email="admin@sagara.co.id", ip="127.0.0.1")
    await session.commit()

    rows = (
        await session.execute(
            select(LoginAttempt).where(LoginAttempt.scope.in_(["email", "ip"]))
        )
    ).scalars()
    assert list(rows)

    await limiter.clear(
        session,
        email="admin@sagara.co.id",
        ip="127.0.0.1",
    )
    await session.commit()

    assert await limiter.check(session, email="admin@sagara.co.id", ip="127.0.0.1") is None
