"""Endpoint data master pelanggan."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session, require_roles
from app.models import User, UserRole
from app.schemas.catalog import (
    CatalogActiveFilter,
    CustomerCreate,
    CustomerList,
    CustomerRead,
    CustomerUpdate,
)
from app.services import catalog as service

router = APIRouter(prefix="/customers", tags=["Pelanggan"])

AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get(
    "",
    response_model=CustomerList,
    summary="Daftar pelanggan",
)
async def list_customers(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(max_length=160)] = None,
    active: Annotated[CatalogActiveFilter, Query()] = CatalogActiveFilter.AKTIF,
) -> CustomerList:
    """Kembalikan pelanggan dengan filter status dan pagination server-side."""

    return await service.list_customers(
        session,
        page=page,
        page_size=page_size,
        search=search,
        active=active,
    )


@router.post(
    "",
    response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah pelanggan",
)
async def create_customer(
    payload: CustomerCreate,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CustomerRead:
    """Buat pelanggan baru; hanya admin yang dapat menulis."""

    customer = await service.create_customer(session, payload)
    await session.commit()
    return customer


@router.get(
    "/{customer_id}",
    response_model=CustomerRead,
    summary="Detail pelanggan",
)
async def get_customer(
    customer_id: UUID,
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CustomerRead:
    """Kembalikan detail satu pelanggan."""

    return await service.get_customer(session, customer_id)


@router.patch(
    "/{customer_id}",
    response_model=CustomerRead,
    summary="Ubah pelanggan",
)
async def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CustomerRead:
    """Ubah data pelanggan; hanya admin yang dapat menulis."""

    customer = await service.update_customer(session, customer_id, payload)
    await session.commit()
    return customer


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Nonaktifkan pelanggan",
)
async def deactivate_customer(
    customer_id: UUID,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    """Nonaktifkan pelanggan tanpa menghapus data."""

    await service.deactivate_customer(session, customer_id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
