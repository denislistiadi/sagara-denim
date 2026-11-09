"""Utilitas kata sandi dan token."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.config import get_settings

settings = get_settings()

_password_hasher = PasswordHasher()
_dummy_hash: str | None = None


class TokenError(Exception):
    """Token akses tidak valid atau kedaluwarsa."""


def hash_password(password: str) -> str:
    """Hash kata sandi dengan Argon2id."""

    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Periksa kata sandi terhadap hash Argon2."""

    try:
        return _password_hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def verify_dummy_password(password: str) -> None:
    """Lakukan verifikasi palsu agar waktu respons login relatif seragam."""

    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = _password_hasher.hash("kata-sandi-palsu-untuk-timing")
    verify_password(_dummy_hash, password)


def create_access_token(user_id: UUID, role: str) -> tuple[str, datetime]:
    """Buat JWT akses berumur pendek."""

    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.access_token_minutes)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": issued_at,
        "exp": expires_at,
    }
    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token, expires_at


def decode_access_token(token: str) -> dict:
    """Validasi dan dekode JWT akses."""

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "sub", "type"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenError("Token akses tidak valid.") from exc

    if payload.get("type") != "access":
        raise TokenError("Jenis token tidak sesuai.")
    return payload


def generate_refresh_token() -> str:
    """Buat refresh token opak yang acak."""

    return secrets.token_urlsafe(48)


def hash_refresh_token(raw_token: str) -> str:
    """Hash refresh token sebelum disimpan ke database."""

    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
