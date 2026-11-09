"""Rate limit login di application layer.

Kontrak ``LoginRateLimiter`` memisahkan route autentikasi dari penyimpanan.
Implementasi saat ini memakai PostgreSQL; implementasi Redis dapat ditambahkan
tanpa mengubah route.
"""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from math import ceil
from typing import Protocol
from uuid import uuid4

from sqlalchemy import and_, case, delete, not_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.models import LoginAttempt


@dataclass(frozen=True, slots=True)
class LoginBlock:
    """Blokir aktif yang harus dikembalikan sebagai 429."""

    scope: str
    retry_after_seconds: int


class LoginRateLimiter(Protocol):
    """Kontrak pembatas login."""

    async def check(
        self,
        session: AsyncSession,
        *,
        email: str,
        ip: str | None,
    ) -> LoginBlock | None: ...

    async def record_failure(
        self,
        session: AsyncSession,
        *,
        email: str,
        ip: str | None,
    ) -> int: ...

    async def clear(
        self,
        session: AsyncSession,
        *,
        email: str,
        ip: str | None,
    ) -> None: ...


@dataclass(frozen=True, slots=True)
class _Scope:
    """Satu dimensi pembatas dengan limit dan jendela waktu."""

    name: str
    key: str
    limit: int
    window: timedelta
    block: timedelta


class PostgresLoginRateLimiter:
    """Simpan kegagalan login di tabel operasional ``login_attempts``."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def check(
        self,
        session: AsyncSession,
        *,
        email: str,
        ip: str | None,
    ) -> LoginBlock | None:
        """Kembalikan blokir aktif bila email atau IP masih diblokir."""

        now = datetime.now(UTC)
        scopes = self._scopes(email=email, ip=ip)
        if not scopes:
            return None

        result = await session.execute(
            select(LoginAttempt).where(
                LoginAttempt.scope.in_([scope.name for scope in scopes]),
                LoginAttempt.key_hash.in_([self.key_hash(scope.key) for scope in scopes]),
                LoginAttempt.expires_at > now,
                LoginAttempt.blocked_until.is_not(None),
                LoginAttempt.blocked_until > now,
            )
        )

        blocks = [
            LoginBlock(
                scope=record.scope,
                retry_after_seconds=max(
                    1,
                    ceil((record.blocked_until - now).total_seconds()),
                ),
            )
            for record in result.scalars()
            if record.blocked_until is not None
        ]
        if not blocks:
            return None

        return max(blocks, key=lambda block: block.retry_after_seconds)

    async def record_failure(
        self,
        session: AsyncSession,
        *,
        email: str,
        ip: str | None,
    ) -> int:
        """Catat satu kegagalan dan kembalikan jumlah kegagalan terbesar."""

        now = datetime.now(UTC)
        highest = 0

        for scope in self._scopes(email=email, ip=ip):
            failures = await self._record_one(session, scope=scope, now=now)
            highest = max(highest, failures)

        await session.flush()
        return highest

    async def clear(
        self,
        session: AsyncSession,
        *,
        email: str,
        ip: str | None,
    ) -> None:
        """Hapus state setelah login berhasil."""

        scopes = self._scopes(email=email, ip=ip)
        if not scopes:
            return

        await session.execute(
            delete(LoginAttempt).where(
                LoginAttempt.scope.in_([scope.name for scope in scopes]),
                LoginAttempt.key_hash.in_([self.key_hash(scope.key) for scope in scopes]),
            )
        )

    async def cleanup_expired(self, session: AsyncSession) -> int:
        """Hapus seluruh baris yang sudah kedaluwarsa."""

        result = await session.execute(
            delete(LoginAttempt).where(LoginAttempt.expires_at < datetime.now(UTC))
        )
        await session.flush()
        return int(result.rowcount or 0)

    async def _record_one(
        self,
        session: AsyncSession,
        *,
        scope: _Scope,
        now: datetime,
    ) -> int:
        """Upsert atomik satu baris scope dan kembalikan jumlah kegagalan."""

        expires_at = now + scope.window
        blocked_until = now + scope.block
        expired = LoginAttempt.expires_at < now
        next_failures = case((expired, 1), else_=LoginAttempt.failures + 1)
        should_block = and_(not_(expired), next_failures >= scope.limit)

        statement = (
            pg_insert(LoginAttempt)
            .values(
                id=uuid4(),
                scope=scope.name,
                key_hash=self.key_hash(scope.key),
                failures=1,
                first_failure_at=now,
                last_failure_at=now,
                blocked_until=None,
                expires_at=expires_at,
                created_at=now,
            )
            .on_conflict_do_update(
                constraint="uq_login_attempts_scope_key_hash",
                set_={
                    "failures": next_failures,
                    "first_failure_at": case(
                        (expired, now),
                        else_=LoginAttempt.first_failure_at,
                    ),
                    "last_failure_at": now,
                    "blocked_until": case(
                        (should_block, blocked_until),
                        else_=LoginAttempt.blocked_until,
                    ),
                    "expires_at": case(
                        (expired, expires_at),
                        (
                            should_block,
                            case(
                                (blocked_until > LoginAttempt.expires_at, blocked_until),
                                else_=LoginAttempt.expires_at,
                            ),
                        ),
                        else_=LoginAttempt.expires_at,
                    ),
                },
            )
            .returning(LoginAttempt.failures)
        )

        result = await session.execute(statement)
        return int(result.scalar_one())

    def _scopes(self, *, email: str, ip: str | None) -> list[_Scope]:
        """Bangun scope dari konfigurasi dan identitas request."""

        scopes = [
            _Scope(
                name="email",
                key=email.strip().lower(),
                limit=self.settings.login_max_failures_email,
                window=timedelta(minutes=self.settings.login_window_minutes),
                block=timedelta(minutes=self.settings.login_block_minutes),
            )
        ]
        if ip:
            scopes.append(
                _Scope(
                    name="ip",
                    key=ip.strip(),
                    limit=self.settings.login_max_failures_ip,
                    window=timedelta(minutes=self.settings.login_window_minutes),
                    block=timedelta(minutes=self.settings.login_block_minutes),
                )
            )
        return scopes

    def key_hash(self, key: str) -> str:
        """HMAC-SHA256 agar email/IP mentah tidak tersimpan."""

        return hmac.new(
            self.settings.jwt_secret.encode("utf-8"),
            key.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
