"""Endpoint data master produk."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session, require_roles
from app.models import User, UserRole
from app.schemas.catalog import (
    CatalogActiveFilter,
    ProductCreate,
    ProductList,
    ProductRead,
    ProductUpdate,
)
from app.services import catalog as service

router = APIRouter(prefix="/products", tags=["Produk"])

AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get(
    "",
    response_model=ProductList,
    summary="Daftar produk",
)
async def list_products(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(max_length=160)] = None,
    active: Annotated[CatalogActiveFilter, Query()] = CatalogActiveFilter.AKTIF,
) -> ProductList:
    """Kembalikan model produk dengan filter status dan pagination server-side."""

    return await service.list_products(
        session,
        page=page,
        page_size=page_size,
        search=search,
        active=active,
    )


@router.post(
    "",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah produk",
)
async def create_product(
    payload: ProductCreate,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductRead:
    """Buat model produk baru; hanya admin yang dapat menulis."""

    product = await service.create_product(session, payload)
    await session.commit()
    return product


@router.get(
    "/{product_id}",
    response_model=ProductRead,
    summary="Detail produk",
)
async def get_product(
    product_id: UUID,
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductRead:
    """Kembalikan detail satu model produk."""

    return await service.get_product(session, product_id)


@router.patch(
    "/{product_id}",
    response_model=ProductRead,
    summary="Ubah produk",
)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductRead:
    """Ubah data produk; hanya admin yang dapat menulis."""

    product = await service.update_product(session, product_id, payload)
    await session.commit()
    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Nonaktifkan produk",
)
async def deactivate_product(
    product_id: UUID,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    """Nonaktifkan produk tanpa menghapus data."""

    await service.deactivate_product(session, product_id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
