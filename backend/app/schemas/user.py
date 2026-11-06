"""Skema pengguna."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.enums import UserRole

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def validate_password(value: str) -> str:
    """Pastikan kata sandi memenuhi kebijakan minimal."""

    if len(value) < PASSWORD_MIN_LENGTH:
        raise ValueError("Kata sandi minimal 8 karakter.")
    if not any(character.isalpha() for character in value):
        raise ValueError("Kata sandi harus memuat huruf.")
    if not any(character.isdigit() for character in value):
        raise ValueError("Kata sandi harus memuat angka.")
    return value


def _normalize_email(value: object) -> object:
    return value.strip().lower() if isinstance(value, str) else value


class UserActiveFilter(StrEnum):
    """Filter status aktif pengguna."""

    AKTIF = "aktif"
    NONAKTIF = "nonaktif"
    SEMUA = "semua"


class UserRead(BaseModel):
    """Data pengguna yang aman dikirim ke klien."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


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


class UserCreate(BaseModel):
    """Payload pembuatan pengguna baru."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    role: UserRole = UserRole.OPERATOR
    password: str = Field(
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
    )
    is_active: bool = True

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        return _normalize_email(value)

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        return validate_password(value)


class UserUpdate(BaseModel):
    """Payload perubahan data pengguna."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: UserRole | None = None
    is_active: bool | None = None

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        return _normalize_email(value)

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def _validate_changes(self) -> "UserUpdate":
        changes = self.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("Minimal satu field harus diisi.")
        if any(value is None for value in changes.values()):
            raise ValueError("Field yang diubah tidak boleh bernilai null.")
        return self


class PasswordReset(BaseModel):
    """Payload penetapan kata sandi baru oleh admin."""

    model_config = ConfigDict(extra="forbid")

    new_password: str = Field(
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
    )

    @field_validator("new_password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        return validate_password(value)


class UserList(BaseModel):
    """Daftar pengguna dengan pagination."""

    items: list[UserRead]
    total: int
    page: int
    page_size: int
    total_pages: int
