"""Skema autentikasi."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    """Kredensial masuk."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthSession(BaseModel):
    """Sesi yang dikembalikan setelah login atau refresh."""

    user: UserRead
    access_expires_at: datetime
    refresh_expires_at: datetime


class MessageResponse(BaseModel):
    """Pesan sederhana untuk klien."""

    message: str
