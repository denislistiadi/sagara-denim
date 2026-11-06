"""Logika bisnis data master pelanggan dan produk."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, Product
from app.schemas.catalog import (
    CatalogActiveFilter,
    CustomerCreate,
    CustomerList,
    CustomerRead,
    CustomerUpdate,
    ProductCreate,
    ProductList,
    ProductRead,
    ProductUpdate,
)


def _not_found(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=message,
    )


def _conflict(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def _active_conditions(
    active: CatalogActiveFilter,
    *,
    model: type[Customer] | type[Product],
) -> list:
    """Bangun kondisi filter status aktif untuk data master."""

    if active == CatalogActiveFilter.AKTIF:
        return [model.is_active.is_(True)]
    if active == CatalogActiveFilter.NONAKTIF:
        return [model.is_active.is_(False)]
    return []


async def _customer_model(session: AsyncSession, customer_id: UUID) -> Customer:
    customer = await session.get(Customer, customer_id, populate_existing=True)
    if customer is None:
        raise _not_found("Pelanggan tidak ditemukan.")
    return customer


async def _product_model(session: AsyncSession, product_id: UUID) -> Product:
    product = await session.get(Product, product_id, populate_existing=True)
    if product is None:
        raise _not_found("Produk tidak ditemukan.")
    return product


def _customer_conditions(
    *,
    search: str | None,
    active: CatalogActiveFilter,
) -> list:
    conditions = _active_conditions(active, model=Customer)

    term = search.strip() if search else None
    if term:
        pattern = f"%{term}%"
        conditions.append(
            or_(
                Customer.code.ilike(pattern),
                Customer.name.ilike(pattern),
            )
        )

    return conditions


def _product_conditions(
    *,
    search: str | None,
    active: CatalogActiveFilter,
) -> list:
    conditions = _active_conditions(active, model=Product)

    term = search.strip() if search else None
    if term:
        pattern = f"%{term}%"
        conditions.append(
            or_(
                Product.code.ilike(pattern),
                Product.name.ilike(pattern),
            )
        )

    return conditions


async def list_customers(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    active: CatalogActiveFilter = CatalogActiveFilter.AKTIF,
) -> CustomerList:
    """Ambil daftar pelanggan dengan filter dan pagination di server."""

    conditions = _customer_conditions(search=search, active=active)
    total = (
        await session.scalar(select(func.count(Customer.id)).where(*conditions))
    ) or 0

    customers = (
        await session.scalars(
            select(Customer)
            .where(*conditions)
            .order_by(Customer.name.asc(), Customer.code.asc(), Customer.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    total_pages = (total + page_size - 1) // page_size if total else 0

    return CustomerList(
        items=[CustomerRead.model_validate(customer) for customer in customers],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def get_customer(session: AsyncSession, customer_id: UUID) -> CustomerRead:
    """Ambil detail pelanggan atau lempar 404."""

    customer = await _customer_model(session, customer_id)
    return CustomerRead.model_validate(customer)


async def create_customer(
    session: AsyncSession,
    payload: CustomerCreate,
) -> CustomerRead:
    """Buat pelanggan baru dengan kode unik."""

    duplicate = await session.scalar(
        select(Customer.id).where(func.lower(Customer.code) == payload.code.lower())
    )
    if duplicate is not None:
        raise _conflict("Kode pelanggan sudah digunakan.")

    customer = Customer(**payload.model_dump())
    session.add(customer)
    await session.flush()
    return CustomerRead.model_validate(customer)


async def update_customer(
    session: AsyncSession,
    customer_id: UUID,
    payload: CustomerUpdate,
) -> CustomerRead:
    """Ubah data pelanggan tanpa menghapus riwayat order."""

    customer = await _customer_model(session, customer_id)
    changes = payload.model_dump(exclude_unset=True)

    if "code" in changes and payload.code != customer.code:
        duplicate = await session.scalar(
            select(Customer.id).where(
                func.lower(Customer.code) == payload.code.lower(),
                Customer.id != customer.id,
            )
        )
        if duplicate is not None:
            raise _conflict("Kode pelanggan sudah digunakan.")

    for field, value in changes.items():
        setattr(customer, field, value)

    await session.flush()
    customer = await _customer_model(session, customer_id)
    return CustomerRead.model_validate(customer)


async def deactivate_customer(session: AsyncSession, customer_id: UUID) -> None:
    """Nonaktifkan pelanggan tanpa menghapus data."""

    customer = await _customer_model(session, customer_id)
    customer.is_active = False
    await session.flush()
    await session.refresh(customer)


async def list_products(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    active: CatalogActiveFilter = CatalogActiveFilter.AKTIF,
) -> ProductList:
    """Ambil daftar produk dengan filter dan pagination di server."""

    conditions = _product_conditions(search=search, active=active)
    total = (
        await session.scalar(select(func.count(Product.id)).where(*conditions))
    ) or 0

    products = (
        await session.scalars(
            select(Product)
            .where(*conditions)
            .order_by(Product.name.asc(), Product.code.asc(), Product.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    total_pages = (total + page_size - 1) // page_size if total else 0

    return ProductList(
        items=[ProductRead.model_validate(product) for product in products],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def get_product(session: AsyncSession, product_id: UUID) -> ProductRead:
    """Ambil detail produk atau lempar 404."""

    product = await _product_model(session, product_id)
    return ProductRead.model_validate(product)


async def create_product(
    session: AsyncSession,
    payload: ProductCreate,
) -> ProductRead:
    """Buat model produk baru dengan kode unik."""

    duplicate = await session.scalar(
        select(Product.id).where(func.lower(Product.code) == payload.code.lower())
    )
    if duplicate is not None:
        raise _conflict("Kode produk sudah digunakan.")

    product = Product(**payload.model_dump())
    session.add(product)
    await session.flush()
    return ProductRead.model_validate(product)


async def update_product(
    session: AsyncSession,
    product_id: UUID,
    payload: ProductUpdate,
) -> ProductRead:
    """Ubah data produk tanpa menghapus riwayat order."""

    product = await _product_model(session, product_id)
    changes = payload.model_dump(exclude_unset=True)

    if "code" in changes and payload.code != product.code:
        duplicate = await session.scalar(
            select(Product.id).where(
                func.lower(Product.code) == payload.code.lower(),
                Product.id != product.id,
            )
        )
        if duplicate is not None:
            raise _conflict("Kode produk sudah digunakan.")

    for field, value in changes.items():
        setattr(product, field, value)

    await session.flush()
    product = await _product_model(session, product_id)
    return ProductRead.model_validate(product)


async def deactivate_product(session: AsyncSession, product_id: UUID) -> None:
    """Nonaktifkan produk tanpa menghapus data."""

    product = await _product_model(session, product_id)
    product.is_active = False
    await session.flush()
    await session.refresh(product)
