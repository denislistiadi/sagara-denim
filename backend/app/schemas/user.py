"""Skema pengguna."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import UserRole


class UserRead(BaseModel):
    """Data pengguna yang aman dikirim ke klien."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserOption(BaseModel):
    """Data pengguna ringkas untuk pilihan PIC dan referensi order."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    role: UserRole


class UserOptionList(BaseModel):
    """Daftar pengguna aktif untuk pilihan."""

    items: list[UserOption]
    total: int


class UserList(BaseModel):
    """Daftar pengguna dengan jumlah total."""

    items: list[UserRead]
    total: int
