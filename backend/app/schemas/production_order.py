"""Skema perintah produksi."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import OrderStatus, Priority
from app.schemas.catalog import CustomerOption, ProductOption
from app.schemas.user import UserOption

MAX_ITEMS = 50


class ProductionOrderItemInput(BaseModel):
    """Item model yang dikirim saat membuat atau mengubah order."""

    product_id: UUID
    quantity: int = Field(gt=0, le=1_000_000)
    notes: str | None = Field(default=None, max_length=500)


def _validate_unique_products(items: list[ProductionOrderItemInput]) -> None:
    product_ids = [item.product_id for item in items]
    if len(product_ids) != len(set(product_ids)):
        raise ValueError("Model produk tidak boleh duplikat dalam satu order.")


class ProductionOrderCreate(BaseModel):
    """Payload pembuatan perintah produksi."""

    customer_id: UUID | None = None
    pic_id: UUID | None = None
    priority: Priority = Priority.NORMAL
    deadline: date | None = None
    notes: str | None = Field(default=None, max_length=2_000)
    items: list[ProductionOrderItemInput] = Field(min_length=1, max_length=MAX_ITEMS)

    @model_validator(mode="after")
    def validate_items(self) -> "ProductionOrderCreate":
        _validate_unique_products(self.items)
        return self


class ProductionOrderUpdate(BaseModel):
    """Payload perubahan sebagian perintah produksi.

    Jika `items` dikirim, seluruh item lama diganti dengan daftar baru.
    Field yang tidak dikirim tidak diubah.
    """

    customer_id: UUID | None = None
    pic_id: UUID | None = None
    priority: Priority | None = None
    deadline: date | None = None
    notes: str | None = Field(default=None, max_length=2_000)
    items: list[ProductionOrderItemInput] | None = Field(
        default=None,
        min_length=1,
        max_length=MAX_ITEMS,
    )

    @model_validator(mode="after")
    def validate_update(self) -> "ProductionOrderUpdate":
        if not self.model_fields_set:
            raise ValueError("Tidak ada perubahan yang dikirim.")
        if self.items is not None:
            _validate_unique_products(self.items)
        return self


class ProductionStatusUpdate(BaseModel):
    """Payload transisi status perintah produksi."""

    expected_status: OrderStatus
    to_status: OrderStatus
    notes: str | None = Field(default=None, max_length=1_000)


class ProductionLogCreate(BaseModel):
    """Payload penambahan log produksi pada tahap yang sedang berjalan."""

    log_date: date | None = None
    output_qty: int = Field(ge=0, le=1_000_000)
    reject_qty: int = Field(ge=0, le=1_000_000)
    notes: str | None = Field(default=None, max_length=1_000)

    @model_validator(mode="after")
    def validate_quantities(self) -> "ProductionLogCreate":
        if self.output_qty + self.reject_qty <= 0:
            raise ValueError("Output dan reject tidak boleh sama-sama nol.")
        return self


class ProductionOrderItemRead(BaseModel):
    """Item model di dalam detail perintah produksi."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product: ProductOption
    quantity: int
    notes: str | None


class OrderStatusHistoryRead(BaseModel):
    """Satu peristiwa perubahan status."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_status: OrderStatus | None
    to_status: OrderStatus
    changed_by: UserOption | None
    notes: str | None
    created_at: datetime


class ProductionLogRead(BaseModel):
    """Satu catatan output produksi."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    stage: OrderStatus
    log_date: date
    output_qty: int
    reject_qty: int
    notes: str | None
    created_by: UserOption | None
    created_at: datetime


class ProductionOrderListItem(BaseModel):
    """Ringkasan perintah produksi untuk tabel daftar."""

    id: UUID
    code: str
    customer: CustomerOption | None
    pic: UserOption | None
    status: OrderStatus
    priority: Priority
    deadline: date | None
    total_quantity: int
    item_count: int
    model_summary: str
    progress: int
    created_at: datetime
    updated_at: datetime


class ProductionOrderDetail(ProductionOrderListItem):
    """Detail lengkap perintah produksi."""

    notes: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_by: UserOption | None
    items: list[ProductionOrderItemRead]
    status_history: list[OrderStatusHistoryRead]
    production_logs: list[ProductionLogRead]


class ProductionOrderList(BaseModel):
    """Hasil daftar perintah produksi dengan metadata pagination."""

    items: list[ProductionOrderListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    """Pesan sederhana untuk klien."""

    message: str
