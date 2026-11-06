"""Endpoint pengguna (khusus admin)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session, require_roles
from app.models import User, UserRole
from app.schemas.auth import MessageResponse
from app.schemas.user import (
    PasswordReset,
    UserActiveFilter,
    UserCreate,
    UserList,
    UserOption,
    UserOptionList,
    UserRead,
    UserUpdate,
)
from app.services import users as service

router = APIRouter(prefix="/users", tags=["Pengguna"])

AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get(
    "/options",
    response_model=UserOptionList,
    summary="Pilihan PIC",
)
async def list_user_options(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserOptionList:
    """Kembalikan pengguna aktif untuk pilihan PIC; tersedia untuk semua peran."""

    users = (
        await session.scalars(select(User).where(User.is_active.is_(True)).order_by(User.name))
    ).all()

    return UserOptionList(
        items=[UserOption.model_validate(user) for user in users],
        total=len(users),
    )


@router.get(
    "",
    response_model=UserList,
    summary="Daftar pengguna (admin)",
)
async def list_users(
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(max_length=160)] = None,
    active: Annotated[UserActiveFilter, Query()] = UserActiveFilter.AKTIF,
) -> UserList:
    """Kembalikan seluruh pengguna; hanya dapat diakses admin."""

    return await service.list_users(
        session,
        page=page,
        page_size=page_size,
        search=search,
        active=active,
    )


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah pengguna (admin)",
)
async def create_user(
    payload: UserCreate,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    """Buat pengguna baru; hanya admin yang dapat menulis."""

    user = await service.create_user(session, payload)
    await session.commit()
    return user


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Ubah pengguna (admin)",
)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    current_user: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    """Ubah data pengguna; admin tidak dapat mengunci akun sendiri."""

    user = await service.update_user(session, user_id, payload, actor=current_user)
    await session.commit()
    return user


@router.post(
    "/{user_id}/reset-password",
    response_model=MessageResponse,
    summary="Reset kata sandi (admin)",
)
async def reset_password(
    user_id: UUID,
    payload: PasswordReset,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MessageResponse:
    """Tetapkan kata sandi baru; seluruh sesi pengguna dicabut."""

    await service.reset_password(session, user_id, payload)
    await session.commit()
    return MessageResponse(message="Kata sandi berhasil direset.")


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Nonaktifkan pengguna (admin)",
)
async def deactivate_user(
    user_id: UUID,
    current_user: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    """Nonaktifkan pengguna tanpa menghapus data."""

    await service.update_user(
        session,
        user_id,
        UserUpdate(is_active=False),
        actor=current_user,
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
