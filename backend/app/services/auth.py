"""Logika autentikasi dan rotasi refresh token."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_dummy_password,
    verify_password,
)
from app.models import RefreshToken, User

settings = get_settings()


class RefreshTokenError(Exception):
    """Refresh token tidak valid, kedaluwarsa, atau sudah dicabut."""


class RefreshTokenReuseError(RefreshTokenError):
    """Refresh token yang sudah dipakai dicoba lagi."""


@dataclass(slots=True)
class IssuedSession:
    """Sesi baru beserta token yang harus dipasang ke cookie."""

    user: User
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime


async def authenticate_user(
    session: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    """Cari pengguna aktif dan verifikasi kata sandi."""

    result = await session.execute(select(User).where(func.lower(User.email) == email.lower()))
    user = result.scalar_one_or_none()

    if user is None:
        verify_dummy_password(password)
        return None

    if not verify_password(user.password_hash, password):
        return None

    if not user.is_active:
        return None

    return user


async def _create_refresh_record(
    session: AsyncSession,
    *,
    user_id,
    user_agent: str | None,
    ip_address: str | None,
) -> tuple[str, RefreshToken]:
    raw_token = generate_refresh_token()
    record = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    session.add(record)
    await session.flush()
    return raw_token, record


async def issue_session(
    session: AsyncSession,
    user: User,
    *,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> IssuedSession:
    """Buat access token dan refresh token baru untuk pengguna."""

    access_token, access_expires_at = create_access_token(user.id, user.role.value)
    refresh_token, record = await _create_refresh_record(
        session,
        user_id=user.id,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    return IssuedSession(
        user=user,
        access_token=access_token,
        refresh_token=refresh_token,
        access_expires_at=access_expires_at,
        refresh_expires_at=record.expires_at,
    )


async def rotate_session(
    session: AsyncSession,
    raw_token: str,
    *,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> IssuedSession:
    """Cabut refresh token lama dan terbitkan pasangan token baru."""

    now = datetime.now(UTC)
    result = await session.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_refresh_token(raw_token))
        .with_for_update()
    )
    record = result.scalar_one_or_none()

    if record is None:
        raise RefreshTokenError("Refresh token tidak ditemukan.")

    if record.revoked_at is not None:
        # Token lama dipakai ulang: cabut seluruh sesi aktif pengguna.
        await session.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == record.user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now, revoked_reason="reuse_detected")
        )
        raise RefreshTokenReuseError("Refresh token sudah dicabut.")

    if record.expires_at <= now:
        record.revoked_at = now
        record.revoked_reason = "expired"
        raise RefreshTokenError("Refresh token kedaluwarsa.")

    user = await session.get(User, record.user_id)
    if user is None or not user.is_active:
        record.revoked_at = now
        record.revoked_reason = "user_inactive"
        raise RefreshTokenError("Pengguna tidak aktif.")

    record.revoked_at = now
    record.revoked_reason = "rotated"

    access_token, access_expires_at = create_access_token(user.id, user.role.value)
    new_raw_token, new_record = await _create_refresh_record(
        session,
        user_id=user.id,
        user_agent=user_agent,
        ip_address=ip_address,
    )

    return IssuedSession(
        user=user,
        access_token=access_token,
        refresh_token=new_raw_token,
        access_expires_at=access_expires_at,
        refresh_expires_at=new_record.expires_at,
    )


async def revoke_session(session: AsyncSession, raw_token: str) -> bool:
    """Cabut satu refresh token saat logout."""

    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token))
    )
    record = result.scalar_one_or_none()

    if record is None or record.revoked_at is not None:
        return False

    record.revoked_at = datetime.now(UTC)
    record.revoked_reason = "logout"
    return True
