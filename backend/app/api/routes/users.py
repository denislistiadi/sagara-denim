"""Endpoint pengguna (khusus admin)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.db import get_session
from app.models import User, UserRole
from app.schemas.user import UserList, UserOption, UserOptionList, UserRead

router = APIRouter(prefix="/users", tags=["Pengguna"])


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
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
async def list_users(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserList:
    """Kembalikan seluruh pengguna; hanya dapat diakses admin."""

    total = await session.scalar(select(func.count()).select_from(User))
    users = (await session.scalars(select(User).order_by(User.name))).all()

    return UserList(
        items=[UserRead.model_validate(user) for user in users],
        total=total or 0,
    )
