"""Endpoint bahan, aksesoris, dan mutasi stok."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session, require_roles
from app.models import StockMovementType, User, UserRole
from app.schemas.material import (
    MaterialActiveFilter,
    MaterialCreate,
    MaterialDetail,
    MaterialList,
    MaterialUpdate,
    StockMovementCreate,
    StockMovementList,
    StockMovementRead,
    StockStatus,
)
from app.services import materials as service

router = APIRouter(prefix="/materials", tags=["Bahan & Aksesoris"])

WriterUser = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR)),
]
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get(
    "",
    response_model=MaterialList,
    summary="Daftar bahan dan aksesoris",
)
async def list_materials(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 10,
    search: Annotated[str | None, Query(max_length=160)] = None,
    category: Annotated[str | None, Query(max_length=80)] = None,
    stock_status: Annotated[StockStatus | None, Query()] = None,
    low_stock: Annotated[bool | None, Query()] = None,
    active: Annotated[MaterialActiveFilter, Query()] = MaterialActiveFilter.AKTIF,
) -> MaterialList:
    """Kembalikan bahan dengan filter, ringkasan, dan pagination server-side."""

    return await service.list_materials(
        session,
        page=page,
        page_size=page_size,
        search=search,
        category=category,
        stock_status=stock_status,
        low_stock=low_stock,
        active=active,
    )


@router.post(
    "",
    response_model=MaterialDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah bahan",
)
async def create_material(
    payload: MaterialCreate,
    current_user: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MaterialDetail:
    """Buat bahan baru; stok awal dicatat sebagai mutasi masuk."""

    material = await service.create_material(session, payload, actor=current_user)
    await session.commit()
    return material


@router.get(
    "/{material_id}",
    response_model=MaterialDetail,
    summary="Detail bahan",
)
async def get_material(
    material_id: UUID,
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MaterialDetail:
    """Kembalikan detail bahan beserta jumlah mutasi."""

    return await service.get_material(session, material_id)


@router.patch(
    "/{material_id}",
    response_model=MaterialDetail,
    summary="Ubah master bahan",
)
async def update_material(
    material_id: UUID,
    payload: MaterialUpdate,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MaterialDetail:
    """Ubah master bahan tanpa mengubah saldo stok."""

    material = await service.update_material(session, material_id, payload)
    await session.commit()
    return material


@router.get(
    "/{material_id}/movements",
    response_model=StockMovementList,
    summary="Riwayat mutasi stok",
)
async def list_material_movements(
    material_id: UUID,
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 10,
    movement_type: Annotated[StockMovementType | None, Query()] = None,
) -> StockMovementList:
    """Kembalikan riwayat mutasi bahan dari yang terbaru."""

    return await service.list_movements(
        session,
        material_id,
        page=page,
        page_size=page_size,
        movement_type=movement_type,
    )


@router.post(
    "/{material_id}/movements",
    response_model=StockMovementRead,
    status_code=status.HTTP_201_CREATED,
    summary="Catat mutasi stok",
)
async def create_material_movement(
    material_id: UUID,
    payload: StockMovementCreate,
    current_user: WriterUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StockMovementRead:
    """Catat stok masuk/keluar; penyesuaian hanya untuk admin."""

    movement = await service.record_movement(
        session,
        material_id,
        payload,
        actor=current_user,
    )
    await session.commit()
    return movement
