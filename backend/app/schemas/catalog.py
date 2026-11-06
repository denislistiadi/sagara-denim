"""Skema data master pelanggan dan produk."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class CatalogActiveFilter(StrEnum):
    """Filter status aktif data master."""

    AKTIF = "aktif"
    NONAKTIF = "nonaktif"
    SEMUA = "semua"


def _clean_text(value: object) -> object:
    """Rapikan spasi di awal dan akhir teks."""

    return value.strip() if isinstance(value, str) else value


def _clean_optional(value: object) -> object:
    """Ubah teks kosong menjadi null untuk field opsional."""

    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return value


class CustomerOption(BaseModel):
    """Data pelanggan ringkas untuk pilihan dan referensi order."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str


class CustomerCreate(BaseModel):
    """Payload pembuatan pelanggan baru."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=500)
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def _normalize_code(cls, value: object) -> object:
        cleaned = _clean_text(value)
        return cleaned.upper() if isinstance(cleaned, str) else cleaned

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: object) -> object:
        return _clean_text(value)

    @field_validator("phone", "email", "address", mode="before")
    @classmethod
    def _normalize_optional(cls, value: object) -> object:
        return _clean_optional(value)


class CustomerUpdate(BaseModel):
    """Payload perubahan data pelanggan."""

    model_config = ConfigDict(extra="forbid")

    code: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None

    @field_validator("code", mode="before")
    @classmethod
    def _normalize_code(cls, value: object) -> object:
        cleaned = _clean_text(value)
        return cleaned.upper() if isinstance(cleaned, str) else cleaned

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: object) -> object:
        return _clean_text(value)

    @field_validator("phone", "email", "address", mode="before")
    @classmethod
    def _normalize_optional(cls, value: object) -> object:
        return _clean_optional(value)

    @model_validator(mode="after")
    def _validate_changes(self) -> "CustomerUpdate":
        changes = self.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("Minimal satu field harus diisi.")
        if changes.get("code", "") is None or changes.get("name", "") is None:
            raise ValueError("Kode dan nama pelanggan tidak boleh bernilai null.")
        return self


class CustomerRead(BaseModel):
    """Data pelanggan lengkap untuk daftar dan detail."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    phone: str | None
    email: str | None
    address: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CustomerList(BaseModel):
    """Daftar pelanggan dengan pagination."""

    items: list[CustomerRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductOption(BaseModel):
    """Data model produk ringkas untuk pilihan dan referensi item."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    size: str | None
    color: str | None


class ProductCreate(BaseModel):
    """Payload pembuatan model produk baru."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=160)
    size: str | None = Field(default=None, max_length=16)
    color: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def _normalize_code(cls, value: object) -> object:
        cleaned = _clean_text(value)
        return cleaned.upper() if isinstance(cleaned, str) else cleaned

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: object) -> object:
        return _clean_text(value)

    @field_validator("size", "color", "description", mode="before")
    @classmethod
    def _normalize_optional(cls, value: object) -> object:
        return _clean_optional(value)


class ProductUpdate(BaseModel):
    """Payload perubahan model produk."""

    model_config = ConfigDict(extra="forbid")

    code: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    size: str | None = Field(default=None, max_length=16)
    color: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None

    @field_validator("code", mode="before")
    @classmethod
    def _normalize_code(cls, value: object) -> object:
        cleaned = _clean_text(value)
        return cleaned.upper() if isinstance(cleaned, str) else cleaned

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: object) -> object:
        return _clean_text(value)

    @field_validator("size", "color", "description", mode="before")
    @classmethod
    def _normalize_optional(cls, value: object) -> object:
        return _clean_optional(value)

    @model_validator(mode="after")
    def _validate_changes(self) -> "ProductUpdate":
        changes = self.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("Minimal satu field harus diisi.")
        if changes.get("code", "") is None or changes.get("name", "") is None:
            raise ValueError("Kode dan nama produk tidak boleh bernilai null.")
        return self


class ProductRead(BaseModel):
    """Data model produk lengkap untuk daftar dan detail."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    size: str | None
    color: str | None
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductList(BaseModel):
    """Daftar model produk dengan pagination."""

    items: list[ProductRead]
    total: int
    page: int
    page_size: int
    total_pages: int
