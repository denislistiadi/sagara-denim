"""Perintah produksi, item, riwayat status, dan log produksi."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_type
from app.models.catalog import Customer, Product
from app.models.enums import OrderStatus, Priority
from app.models.user import User


class ProductionOrder(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Header perintah produksi (SPK).

    Pelanggan bersifat opsional agar produksi untuk stok internal tetap dapat
    dicatat. Satu perintah produksi dapat memiliki beberapa item model.
    """

    __tablename__ = "production_orders"
    __table_args__ = (
        CheckConstraint("total_quantity >= 0", name="total_quantity_non_negative"),
        Index("ix_production_orders_status_deadline", "status", "deadline"),
    )

    code: Mapped[str] = mapped_column(String(32), unique=True)
    customer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    pic_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[OrderStatus] = mapped_column(
        enum_type(OrderStatus, "order_status"),
        default=OrderStatus.MENUNGGU,
        server_default=OrderStatus.MENUNGGU.value,
    )
    priority: Mapped[Priority] = mapped_column(
        enum_type(Priority, "priority"),
        default=Priority.NORMAL,
        server_default=Priority.NORMAL.value,
    )
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    customer: Mapped[Customer | None] = relationship(lazy="joined")
    pic: Mapped[User | None] = relationship(
        foreign_keys=[pic_id],
        lazy="joined",
    )
    created_by: Mapped[User | None] = relationship(
        foreign_keys=[created_by_id],
        lazy="joined",
    )
    items: Mapped[list[ProductionOrderItem]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    status_history: Mapped[list[OrderStatusHistory]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.created_at",
        lazy="selectin",
    )
    production_logs: Mapped[list[ProductionLog]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="ProductionLog.log_date",
        lazy="selectin",
    )


class ProductionOrderItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Item model dan jumlah di dalam satu perintah produksi."""

    __tablename__ = "production_order_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="quantity_positive"),)

    production_order_id: Mapped[UUID] = mapped_column(
        ForeignKey("production_orders.id", ondelete="CASCADE"),
        index=True,
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    order: Mapped[ProductionOrder] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(lazy="joined")


class OrderStatusHistory(UUIDPrimaryKeyMixin, Base):
    """Jejak audit perubahan status perintah produksi."""

    __tablename__ = "order_status_history"

    production_order_id: Mapped[UUID] = mapped_column(
        ForeignKey("production_orders.id", ondelete="CASCADE"),
        index=True,
    )
    from_status: Mapped[OrderStatus | None] = mapped_column(
        enum_type(OrderStatus, "order_status"),
        nullable=True,
    )
    to_status: Mapped[OrderStatus] = mapped_column(
        enum_type(OrderStatus, "order_status"),
    )
    changed_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    order: Mapped[ProductionOrder] = relationship(back_populates="status_history")
    changed_by: Mapped[User | None] = relationship(lazy="joined")


class ProductionLog(UUIDPrimaryKeyMixin, Base):
    """Catatan output dan reject harian pada suatu tahap produksi."""

    __tablename__ = "production_logs"
    __table_args__ = (
        CheckConstraint("output_qty >= 0", name="output_non_negative"),
        CheckConstraint("reject_qty >= 0", name="reject_non_negative"),
        Index("ix_production_logs_order_date", "production_order_id", "log_date"),
    )

    production_order_id: Mapped[UUID] = mapped_column(
        ForeignKey("production_orders.id", ondelete="CASCADE"),
    )
    stage: Mapped[OrderStatus] = mapped_column(enum_type(OrderStatus, "order_status"))
    log_date: Mapped[date] = mapped_column(Date)
    output_qty: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
    )
    reject_qty: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    order: Mapped[ProductionOrder] = relationship(back_populates="production_logs")
    created_by: Mapped[User | None] = relationship(lazy="joined")
