"""Model state operasional autentikasi."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin


class LoginAttempt(UUIDPrimaryKeyMixin, Base):
    """Kegagalan login per scope (email atau IP) dengan TTL.

    Baris ini adalah state operasional, bukan data domain. Kunci disimpan
    sebagai HMAC-SHA256 sehingga email/IP mentah tidak tersimpan di tabel.
    """

    __tablename__ = "login_attempts"
    __table_args__ = (
        UniqueConstraint(
            "scope",
            "key_hash",
            name="uq_login_attempts_scope_key_hash",
        ),
        Index("ix_login_attempts_expires_at", "expires_at"),
    )

    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    failures: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    first_failure_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    last_failure_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    blocked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
