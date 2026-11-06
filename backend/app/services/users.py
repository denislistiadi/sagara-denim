"""Logika bisnis pengguna dan penetapan kata sandi."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import RefreshToken, User
from app.schemas.user import (
    PasswordReset,
    UserActiveFilter,
    UserCreate,
    UserList,
    UserRead,
    UserUpdate,
)


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Pengguna tidak ditemukan.",
    )


def _conflict(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


async def _user_model(session: AsyncSession, user_id: UUID) -> User:
    user = await session.get(User, user_id, populate_existing=True)
    if user is None:
        raise _not_found()
    return user


async def _revoke_tokens(
    session: AsyncSession,
    user_id: UUID,
    *,
    reason: str,
) -> None:
    """Cabut seluruh refresh token aktif milik pengguna."""

    await session.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC), revoked_reason=reason)
    )


async def list_users(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    active: UserActiveFilter = UserActiveFilter.AKTIF,
) -> UserList:
    """Ambil daftar pengguna dengan filter dan pagination di server."""

    conditions: list = []

    if active == UserActiveFilter.AKTIF:
        conditions.append(User.is_active.is_(True))
    elif active == UserActiveFilter.NONAKTIF:
        conditions.append(User.is_active.is_(False))

    term = search.strip() if search else None
    if term:
        pattern = f"%{term}%"
        conditions.append(
            or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern),
            )
        )

    total = (
        await session.scalar(select(func.count(User.id)).where(*conditions))
    ) or 0

    users = (
        await session.scalars(
            select(User)
            .where(*conditions)
            .order_by(User.name.asc(), User.email.asc(), User.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    total_pages = (total + page_size - 1) // page_size if total else 0

    return UserList(
        items=[UserRead.model_validate(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def create_user(session: AsyncSession, payload: UserCreate) -> UserRead:
    """Buat pengguna baru dengan email unik dan kata sandi ter-hash."""

    duplicate = await session.scalar(
        select(User.id).where(func.lower(User.email) == payload.email.lower())
    )
    if duplicate is not None:
        raise _conflict("Email pengguna sudah digunakan.")

    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.role,
        is_active=payload.is_active,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return UserRead.model_validate(user)


async def update_user(
    session: AsyncSession,
    user_id: UUID,
    payload: UserUpdate,
    *,
    actor: User,
) -> UserRead:
    """Ubah data pengguna dan cabut sesi bila peran atau status berubah."""

    user = await _user_model(session, user_id)
    changes = payload.model_dump(exclude_unset=True)
    is_self = user.id == actor.id

    if is_self and "is_active" in changes and payload.is_active is False:
        raise _conflict("Anda tidak dapat menonaktifkan akun sendiri.")

    role_changed = "role" in changes and payload.role != user.role
    deactivated = (
        "is_active" in changes
        and payload.is_active is False
        and user.is_active
    )

    if is_self and role_changed:
        raise _conflict("Anda tidak dapat mengubah peran akun sendiri.")

    if "email" in changes and payload.email != user.email:
        duplicate = await session.scalar(
            select(User.id).where(
                func.lower(User.email) == payload.email.lower(),
                User.id != user.id,
            )
        )
        if duplicate is not None:
            raise _conflict("Email pengguna sudah digunakan.")

    for field, value in changes.items():
        setattr(user, field, value)

    await session.flush()

    if deactivated:
        await _revoke_tokens(session, user.id, reason="user_deactivated")
    elif role_changed:
        await _revoke_tokens(session, user.id, reason="role_changed")

    await session.refresh(user)
    return UserRead.model_validate(user)


async def reset_password(
    session: AsyncSession,
    user_id: UUID,
    payload: PasswordReset,
) -> None:
    """Tetapkan kata sandi baru dan cabut seluruh sesi pengguna."""

    user = await _user_model(session, user_id)
    user.password_hash = hash_password(payload.new_password)
    await session.flush()
    await _revoke_tokens(session, user.id, reason="password_reset")
