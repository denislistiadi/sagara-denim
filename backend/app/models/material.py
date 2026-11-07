"""Bahan, aksesoris, dan pergerakan stok."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_type
from app.models.enums import StockMovementType
from app.models.production import ProductionOrder
from app.models.user import User


class Material(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Bahan atau aksesoris dengan stok dan batas minimum."""

    __tablename__ = "materials"
    __table_args__ = (
        CheckConstraint("stock_qty >= 0", name="stock_non_negative"),
        CheckConstraint("minimum_stock >= 0", name="minimum_non_negative"),
        Index("ix_materials_active_name", "is_active", "name"),
        Index("ix_materials_category_name", "category", "name"),
    )

    sku: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80))
    unit: Mapped[str] = mapped_column(String(16))
    stock_qty: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        server_default=text("0"),
    )
    minimum_stock: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        server_default=text("0"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
    )

    movements: Mapped[list[StockMovement]] = relationship(
        back_populates="material",
        cascade="all, delete-orphan",
        order_by="StockMovement.created_at",
        lazy="raise",
    )


class StockMovement(UUIDPrimaryKeyMixin, Base):
    """Mutasi stok masuk, keluar, atau penyesuaian."""

    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        Index("ix_stock_movements_material_created", "material_id", "created_at"),
    )

    material_id: Mapped[UUID] = mapped_column(
        ForeignKey("materials.id", ondelete="CASCADE"),
    )
    movement_type: Mapped[StockMovementType] = mapped_column(
        enum_type(StockMovementType, "stock_movement_type"),
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    stock_before: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    stock_after: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    production_order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("production_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    material: Mapped[Material] = relationship(back_populates="movements")
    production_order: Mapped[ProductionOrder | None] = relationship(lazy="joined")
    created_by: Mapped[User | None] = relationship(lazy="joined")
