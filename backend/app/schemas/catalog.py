"""Skema data master pelanggan dan produk."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CustomerOption(BaseModel):
    """Data pelanggan ringkas untuk pilihan dan referensi order."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str


class CustomerList(BaseModel):
    """Daftar pelanggan aktif."""

    items: list[CustomerOption]
    total: int


class ProductOption(BaseModel):
    """Data model produk ringkas untuk pilihan dan referensi item."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    size: str | None
    color: str | None


class ProductList(BaseModel):
    """Daftar model produk aktif."""

    items: list[ProductOption]
    total: int
