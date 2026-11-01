"""Endpoint perintah produksi."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session, require_roles
from app.models import OrderStatus, Priority, User, UserRole
from app.schemas.production_order import (
    MessageResponse,
    ProductionOrderCreate,
    ProductionOrderDetail,
    ProductionOrderList,
    ProductionOrderUpdate,
)
from app.services import production_orders as service

router = APIRouter(prefix="/production-orders", tags=["Perintah Produksi"])

WriterUser = Annotated[
    User,
    Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR)),
]
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get(
    "",
    response_model=ProductionOrderList,
    summary="Daftar perintah produksi",
)
async def list_production_orders(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 10,
    search: Annotated[str | None, Query(max_length=160)] = None,
    status_filter: Annotated[
        OrderStatus | None,
        Query(alias="status", description="Filter status produksi."),
    ] = None,
    priority: Annotated[Priority | None, Query()] = None,
    customer_id: Annotated[UUID | None, Query()] = None,
) -> ProductionOrderList:
    """Kembalikan perintah produksi aktif dengan filter server-side."""

    return await service.list_orders(
        session,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
        priority=priority,
        customer_id=customer_id,
    )


@router.post(
    "",
    response_model=ProductionOrderDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Buat perintah produksi",
)
async def create_production_order(
    payload: ProductionOrderCreate,
    current_user: WriterUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductionOrderDetail:
    """Buat header, item, dan history status awal dalam satu transaksi."""

    order = await service.create_order(session, payload, created_by=current_user)
    await session.commit()
    return await service.get_order_detail(session, order.id)


@router.get(
    "/{order_id}",
    response_model=ProductionOrderDetail,
    summary="Detail perintah produksi",
)
async def get_production_order(
    order_id: UUID,
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductionOrderDetail:
    """Kembalikan detail order beserta item, timeline, dan log produksi."""

    return await service.get_order_detail(session, order_id)


@router.patch(
    "/{order_id}",
    response_model=ProductionOrderDetail,
    summary="Ubah perintah produksi",
)
async def update_production_order(
    order_id: UUID,
    payload: ProductionOrderUpdate,
    _: WriterUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProductionOrderDetail:
    """Ubah header dan/atau ganti seluruh item order."""

    await service.update_order(session, order_id, payload)
    await session.commit()
    return await service.get_order_detail(session, order_id)


@router.delete(
    "/{order_id}",
    response_model=MessageResponse,
    summary="Arsipkan perintah produksi",
)
async def archive_production_order(
    order_id: UUID,
    _: AdminUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MessageResponse:
    """Arsipkan order dengan soft delete agar riwayat tetap tersimpan."""

    await service.archive_order(session, order_id)
    await session.commit()
    return MessageResponse(message="Perintah produksi berhasil diarsipkan.")
