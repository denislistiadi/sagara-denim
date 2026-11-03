"""Skema bahan, aksesoris, dan mutasi stok."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import StockMovementType
from app.schemas.user import UserOption

MAX_NOTE_LENGTH = 1_000


class StockStatus(StrEnum):
    """Status stok yang dihitung dari saldo dan batas minimum."""

    HABIS = "habis"
    KRITIS = "kritis"
    MENIPIS = "menipis"
    AMAN = "aman"


class MaterialActiveFilter(StrEnum):
    """Filter status aktif bahan."""

    AKTIF = "aktif"
    NONAKTIF = "nonaktif"
    SEMUA = "semua"


def _clean_text(value: object) -> object:
    """Rapikan spasi di awal dan akhir teks."""

    return value.strip() if isinstance(value, str) else value


class MaterialCreate(BaseModel):
    """Payload pembuatan bahan baru."""

    model_config = ConfigDict(extra="forbid")

    sku: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    unit: str = Field(min_length=1, max_length=16)
    minimum_stock: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    initial_stock: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    is_active: bool = True

    @field_validator("sku", mode="before")
    @classmethod
    def _normalize_sku(cls, value: object) -> object:
        cleaned = _clean_text(value)
        return cleaned.upper() if isinstance(cleaned, str) else cleaned

    @field_validator("name", "category", "unit", mode="before")
    @classmethod
    def _normalize_fields(cls, value: object) -> object:
        return _clean_text(value)


class MaterialUpdate(BaseModel):
    """Payload perubahan master bahan."""

    model_config = ConfigDict(extra="forbid")

    sku: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    unit: str | None = Field(default=None, min_length=1, max_length=16)
    minimum_stock: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    is_active: bool | None = None

    @field_validator("sku", mode="before")
    @classmethod
    def _normalize_sku(cls, value: object) -> object:
        cleaned = _clean_text(value)
        return cleaned.upper() if isinstance(cleaned, str) else cleaned

    @field_validator("name", "category", "unit", mode="before")
    @classmethod
    def _normalize_fields(cls, value: object) -> object:
        return _clean_text(value)

    @model_validator(mode="after")
    def _validate_changes(self) -> "MaterialUpdate":
        changes = self.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("Minimal satu field harus diisi.")
        if any(value is None for value in changes.values()):
            raise ValueError("Field yang diubah tidak boleh bernilai null.")
        return self


class MaterialSummary(BaseModel):
    """Ringkasan bahan untuk tabel daftar."""

    id: UUID
    sku: str
    name: str
    category: str
    unit: str
    stock_qty: Decimal
    minimum_stock: Decimal
    status: StockStatus
    is_active: bool
    updated_at: datetime


class MaterialDetail(MaterialSummary):
    """Detail bahan beserta jumlah mutasi."""

    movement_count: int
    created_at: datetime


class MaterialInventorySummary(BaseModel):
    """Ringkasan inventori dari seluruh bahan aktif."""

    total_active: int
    out_of_stock: int
    below_minimum: int
    categories: list[str]


class MaterialList(BaseModel):
    """Hasil daftar bahan dengan ringkasan dan pagination."""

    items: list[MaterialSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: MaterialInventorySummary


class ProductionOrderRef(BaseModel):
    """Referensi ringkas perintah produksi pada mutasi stok."""

    id: UUID
    code: str


class StockMovementCreate(BaseModel):
    """Payload pencatatan mutasi stok."""

    model_config = ConfigDict(extra="forbid")

    movement_type: StockMovementType
    quantity: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )
    target_stock: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    note: str | None = Field(default=None, max_length=MAX_NOTE_LENGTH)
    production_order_id: UUID | None = None

    @field_validator("note", mode="before")
    @classmethod
    def _normalize_note(cls, value: object) -> object:
        return _clean_text(value)

    @model_validator(mode="after")
    def _validate_movement_rules(self) -> "StockMovementCreate":
        if self.movement_type in (
            StockMovementType.MASUK,
            StockMovementType.KELUAR,
        ):
            if self.quantity is None:
                raise ValueError("Jumlah wajib diisi untuk mutasi masuk atau keluar.")
            if self.target_stock is not None:
                raise ValueError("Target stok hanya untuk penyesuaian.")
            if (
                self.movement_type == StockMovementType.MASUK
                and self.production_order_id is not None
            ):
                raise ValueError(
                    "Perintah produksi hanya dapat dikaitkan dengan stok keluar."
                )
            return self

        if not self.note or len(self.note) < 3:
            raise ValueError("Alasan penyesuaian wajib diisi minimal 3 karakter.")
        if self.target_stock is None:
            raise ValueError("Target stok wajib diisi untuk penyesuaian.")
        if self.quantity is not None:
            raise ValueError("Jumlah tidak digunakan untuk penyesuaian.")
        if self.production_order_id is not None:
            raise ValueError(
                "Perintah produksi hanya dapat dikaitkan dengan stok keluar."
            )
        return self


class StockMovementRead(BaseModel):
    """Satu baris riwayat mutasi stok."""

    id: UUID
    material_id: UUID
    movement_type: StockMovementType
    quantity: Decimal
    stock_before: Decimal | None
    stock_after: Decimal | None
    note: str | None
    production_order: ProductionOrderRef | None
    created_by: UserOption | None
    created_at: datetime


class StockMovementList(BaseModel):
    """Hasil riwayat mutasi dengan metadata pagination."""

    items: list[StockMovementRead]
    total: int
    page: int
    page_size: int
    total_pages: int
