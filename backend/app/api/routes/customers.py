"""Endpoint data master pelanggan."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session
from app.models import Customer
from app.schemas.catalog import CustomerList, CustomerOption

router = APIRouter(prefix="/customers", tags=["Pelanggan"])


@router.get(
    "",
    response_model=CustomerList,
    summary="Daftar pelanggan aktif",
)
async def list_customers(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    search: Annotated[str | None, Query(max_length=160)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> CustomerList:
    """Kembalikan pelanggan aktif untuk pilihan dan referensi order."""

    conditions = [Customer.is_active.is_(True)]
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        conditions.append(
            or_(
                Customer.code.ilike(pattern),
                Customer.name.ilike(pattern),
            )
        )

    total = await session.scalar(select(func.count(Customer.id)).where(*conditions))
    customers = (
        await session.scalars(
            select(Customer).where(*conditions).order_by(Customer.name).limit(limit)
        )
    ).all()

    return CustomerList(
        items=[CustomerOption.model_validate(customer) for customer in customers],
        total=total or 0,
    )
