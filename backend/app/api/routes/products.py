"""Endpoint data master produk."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session
from app.models import Product
from app.schemas.catalog import ProductList, ProductOption

router = APIRouter(prefix="/products", tags=["Produk"])


@router.get(
    "",
    response_model=ProductList,
    summary="Daftar model produk aktif",
)
async def list_products(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    search: Annotated[str | None, Query(max_length=160)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> ProductList:
    """Kembalikan model produk aktif untuk pilihan item produksi."""

    conditions = [Product.is_active.is_(True)]
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        conditions.append(
            or_(
                Product.code.ilike(pattern),
                Product.name.ilike(pattern),
            )
        )

    total = await session.scalar(select(func.count(Product.id)).where(*conditions))
    products = (
        await session.scalars(
            select(Product).where(*conditions).order_by(Product.name, Product.size).limit(limit)
        )
    ).all()

    return ProductList(
        items=[ProductOption.model_validate(product) for product in products],
        total=total or 0,
    )
