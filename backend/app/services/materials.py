"""Logika bisnis bahan, aksesoris, dan mutasi stok."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Material,
    ProductionOrder,
    StockMovement,
    StockMovementType,
    User,
    UserRole,
)
from app.schemas.material import (
    MaterialActiveFilter,
    MaterialCreate,
    MaterialDetail,
    MaterialInventorySummary,
    MaterialList,
    MaterialSummary,
    MaterialUpdate,
    ProductionOrderRef,
    StockMovementCreate,
    StockMovementList,
    StockMovementRead,
    StockStatus,
)
from app.schemas.user import UserOption
from app.services.stock import stock_status, stock_status_case

MAX_STOCK = Decimal("9999999999.99")


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Bahan tidak ditemukan.",
    )


def _conflict(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def _invalid(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=message,
    )


def _forbidden() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Anda tidak memiliki akses ke sumber daya ini.",
    )


def _normalize_note(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _format_quantity(value: Decimal) -> str:
    """Tampilkan desimal tanpa nol di belakang koma."""

    return format(value.normalize(), "f")


def _q(value: Decimal) -> Decimal:
    """Samakan skala desimal keluaran API menjadi dua angka di belakang koma."""

    return value.quantize(Decimal("0.01"))


def _material_conditions(
    *,
    search: str | None = None,
    category: str | None = None,
    stock_status: StockStatus | None = None,
    low_stock: bool | None = None,
    active: MaterialActiveFilter = MaterialActiveFilter.AKTIF,
) -> list:
    """Bangun kondisi filter daftar bahan."""

    conditions: list = []

    if active == MaterialActiveFilter.AKTIF:
        conditions.append(Material.is_active.is_(True))
    elif active == MaterialActiveFilter.NONAKTIF:
        conditions.append(Material.is_active.is_(False))

    normalized_search = search.strip() if search else None
    if normalized_search:
        term = f"%{normalized_search}%"
        conditions.append(
            or_(
                Material.sku.ilike(term),
                Material.name.ilike(term),
                Material.category.ilike(term),
            )
        )

    normalized_category = category.strip() if category else None
    if normalized_category:
        conditions.append(Material.category == normalized_category)

    if stock_status is not None:
        conditions.append(stock_status_case() == stock_status.value)

    if low_stock:
        conditions.append(stock_status_case() != StockStatus.AMAN.value)

    return conditions


def _to_summary(material: Material) -> MaterialSummary:
    return MaterialSummary(
        id=material.id,
        sku=material.sku,
        name=material.name,
        category=material.category,
        unit=material.unit,
        stock_qty=_q(material.stock_qty),
        minimum_stock=_q(material.minimum_stock),
        status=stock_status(material.stock_qty, material.minimum_stock),
        is_active=material.is_active,
        updated_at=material.updated_at,
    )


def _to_detail(material: Material, movement_count: int) -> MaterialDetail:
    summary = _to_summary(material)
    return MaterialDetail(
        **summary.model_dump(),
        movement_count=movement_count,
        created_at=material.created_at,
    )


def _to_movement(movement: StockMovement) -> StockMovementRead:
    order = movement.production_order
    return StockMovementRead(
        id=movement.id,
        material_id=movement.material_id,
        movement_type=movement.movement_type,
        quantity=_q(movement.quantity),
        stock_before=(
            _q(movement.stock_before) if movement.stock_before is not None else None
        ),
        stock_after=(
            _q(movement.stock_after) if movement.stock_after is not None else None
        ),
        note=movement.note,
        production_order=(
            ProductionOrderRef(id=order.id, code=order.code) if order is not None else None
        ),
        created_by=(
            UserOption.model_validate(movement.created_by)
            if movement.created_by is not None
            else None
        ),
        created_at=movement.created_at,
    )


async def _movement_count(session: AsyncSession, material_id: UUID) -> int:
    return (
        await session.scalar(
            select(func.count(StockMovement.id)).where(
                StockMovement.material_id == material_id
            )
        )
    ) or 0


async def _get_material_model(session: AsyncSession, material_id: UUID) -> Material:
    material = await session.scalar(
        select(Material)
        .where(Material.id == material_id)
        .execution_options(populate_existing=True)
    )
    if material is None:
        raise _not_found()
    return material


async def _list_summary(session: AsyncSession) -> MaterialInventorySummary:
    """Hitung ringkasan inventori dari seluruh bahan aktif."""

    rows = (
        await session.execute(
            select(Material.stock_qty, Material.minimum_stock).where(
                Material.is_active.is_(True)
            )
        )
    ).all()

    out_of_stock = 0
    below_minimum = 0
    for stock_qty, minimum_stock in rows:
        stock_status_value = stock_status(stock_qty, minimum_stock)
        if stock_status_value == StockStatus.HABIS:
            out_of_stock += 1
        elif stock_status_value in (StockStatus.KRITIS, StockStatus.MENIPIS):
            below_minimum += 1

    categories = (
        await session.scalars(
            select(Material.category).distinct().order_by(Material.category.asc())
        )
    ).all()

    return MaterialInventorySummary(
        total_active=len(rows),
        out_of_stock=out_of_stock,
        below_minimum=below_minimum,
        categories=list(categories),
    )


async def list_materials(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    category: str | None = None,
    stock_status: StockStatus | None = None,
    low_stock: bool | None = None,
    active: MaterialActiveFilter = MaterialActiveFilter.AKTIF,
) -> MaterialList:
    """Ambil daftar bahan dengan filter dan pagination di server."""

    conditions = _material_conditions(
        search=search,
        category=category,
        stock_status=stock_status,
        low_stock=low_stock,
        active=active,
    )

    total = (
        await session.scalar(
            select(func.count(Material.id)).where(*conditions)
        )
    ) or 0

    materials = (
        await session.scalars(
            select(Material)
            .where(*conditions)
            .order_by(
                Material.name.asc(),
                Material.sku.asc(),
                Material.id.asc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    total_pages = (total + page_size - 1) // page_size if total else 0

    return MaterialList(
        items=[_to_summary(material) for material in materials],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        summary=await _list_summary(session),
    )


async def get_material(session: AsyncSession, material_id: UUID) -> MaterialDetail:
    """Ambil detail bahan atau lempar 404."""

    material = await _get_material_model(session, material_id)
    return _to_detail(material, await _movement_count(session, material.id))


async def create_material(
    session: AsyncSession,
    payload: MaterialCreate,
    *,
    actor: User,
) -> MaterialDetail:
    """Buat bahan baru dan catat stok awal sebagai mutasi masuk."""

    duplicate = await session.scalar(
        select(Material.id).where(func.lower(Material.sku) == payload.sku.lower())
    )
    if duplicate is not None:
        raise _conflict("SKU bahan sudah digunakan.")

    material = Material(
        sku=payload.sku,
        name=payload.name,
        category=payload.category,
        unit=payload.unit,
        stock_qty=payload.initial_stock,
        minimum_stock=payload.minimum_stock,
        is_active=payload.is_active,
    )
    session.add(material)
    await session.flush()

    if payload.initial_stock > 0:
        session.add(
            StockMovement(
                material_id=material.id,
                movement_type=StockMovementType.MASUK,
                quantity=payload.initial_stock,
                stock_before=Decimal("0"),
                stock_after=payload.initial_stock,
                note="Stok awal",
                created_by_id=actor.id,
            )
        )
        await session.flush()

    return await get_material(session, material.id)


async def update_material(
    session: AsyncSession,
    material_id: UUID,
    payload: MaterialUpdate,
) -> MaterialDetail:
    """Ubah master bahan tanpa menyentuh saldo stok."""

    material = await _get_material_model(session, material_id)
    changes = payload.model_dump(exclude_unset=True)

    if ("sku" in changes and payload.sku != material.sku) or (
        "unit" in changes and payload.unit != material.unit
    ):
        if await _movement_count(session, material.id) > 0:
            raise _conflict(
                "SKU dan satuan tidak dapat diubah setelah ada mutasi stok."
            )

    if "sku" in changes and payload.sku != material.sku:
        duplicate = await session.scalar(
            select(Material.id).where(
                func.lower(Material.sku) == payload.sku.lower(),
                Material.id != material.id,
            )
        )
        if duplicate is not None:
            raise _conflict("SKU bahan sudah digunakan.")
        material.sku = payload.sku

    if "name" in changes:
        material.name = payload.name
    if "category" in changes:
        material.category = payload.category
    if "unit" in changes:
        material.unit = payload.unit
    if "minimum_stock" in changes:
        material.minimum_stock = payload.minimum_stock
    if "is_active" in changes:
        material.is_active = payload.is_active

    await session.flush()
    return await get_material(session, material.id)


async def record_movement(
    session: AsyncSession,
    material_id: UUID,
    payload: StockMovementCreate,
    *,
    actor: User,
) -> StockMovementRead:
    """Catat mutasi stok dengan row lock dan saldo sebelum/sesudah."""

    if (
        payload.movement_type == StockMovementType.PENYESUAIAN
        and actor.role != UserRole.ADMIN
    ):
        raise _forbidden()

    material = await session.scalar(
        select(Material)
        .where(Material.id == material_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if material is None:
        raise _not_found()
    if not material.is_active:
        raise _conflict("Bahan nonaktif tidak dapat menerima mutasi stok.")

    production_order: ProductionOrder | None = None
    if payload.production_order_id is not None:
        production_order = await session.get(
            ProductionOrder,
            payload.production_order_id,
        )
        if production_order is None or production_order.deleted_at is not None:
            raise _invalid("Perintah produksi tidak ditemukan atau sudah diarsipkan.")

    before = material.stock_qty

    if payload.movement_type == StockMovementType.MASUK:
        quantity = payload.quantity
        after = before + quantity
    elif payload.movement_type == StockMovementType.KELUAR:
        quantity = payload.quantity
        if quantity > before:
            raise _invalid(
                "Stok tidak cukup. "
                f"Sisa stok {_format_quantity(before)} {material.unit}."
            )
        after = before - quantity
    else:
        after = payload.target_stock
        if after == before:
            raise _invalid("Stok tidak berubah.")
        quantity = abs(after - before)

    if after > MAX_STOCK:
        raise _invalid("Saldo stok melebihi batas yang didukung.")

    material.stock_qty = after
    movement = StockMovement(
        material_id=material.id,
        movement_type=payload.movement_type,
        quantity=quantity,
        stock_before=before,
        stock_after=after,
        note=_normalize_note(payload.note),
        production_order_id=payload.production_order_id,
        created_by_id=actor.id,
    )
    session.add(movement)
    await session.flush()
    await session.refresh(movement)

    return StockMovementRead(
        id=movement.id,
        material_id=material.id,
        movement_type=movement.movement_type,
        quantity=_q(movement.quantity),
        stock_before=(
            _q(movement.stock_before) if movement.stock_before is not None else None
        ),
        stock_after=(
            _q(movement.stock_after) if movement.stock_after is not None else None
        ),
        note=movement.note,
        production_order=(
            ProductionOrderRef(
                id=production_order.id,
                code=production_order.code,
            )
            if production_order is not None
            else None
        ),
        created_by=UserOption.model_validate(actor),
        created_at=movement.created_at,
    )


async def list_movements(
    session: AsyncSession,
    material_id: UUID,
    *,
    page: int,
    page_size: int,
    movement_type: StockMovementType | None = None,
) -> StockMovementList:
    """Ambil riwayat mutasi bahan dari yang terbaru."""

    exists = await session.scalar(
        select(Material.id).where(Material.id == material_id)
    )
    if exists is None:
        raise _not_found()

    conditions = [StockMovement.material_id == material_id]
    if movement_type is not None:
        conditions.append(StockMovement.movement_type == movement_type)

    total = (
        await session.scalar(
            select(func.count(StockMovement.id)).where(*conditions)
        )
    ) or 0

    movements = (
        await session.scalars(
            select(StockMovement)
            .where(*conditions)
            .order_by(
                StockMovement.created_at.desc(),
                StockMovement.id.desc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    total_pages = (total + page_size - 1) // page_size if total else 0

    return StockMovementList(
        items=[_to_movement(movement) for movement in movements],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
