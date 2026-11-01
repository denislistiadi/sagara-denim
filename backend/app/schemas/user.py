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


class UserList(BaseModel):
    """Daftar pengguna dengan jumlah total."""

    items: list[UserRead]
    total: int
