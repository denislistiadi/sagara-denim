"""Pengujian konfigurasi aplikasi."""

import pytest
from pydantic import ValidationError

from app.config import DEFAULT_JWT_SECRET, Settings


def test_production_rejects_default_jwt_secret() -> None:
    """Secret contoh tidak boleh dipakai di produksi."""

    with pytest.raises(ValidationError, match="JWT_SECRET production"):
        Settings(
            environment="production",
            jwt_secret=DEFAULT_JWT_SECRET,
            _env_file=None,
        )


def test_production_rejects_short_jwt_secret() -> None:
    """Secret produksi harus memenuhi panjang minimum."""

    with pytest.raises(ValidationError, match="JWT_SECRET production"):
        Settings(
            environment="production",
            jwt_secret="pendek",
            _env_file=None,
        )


def test_production_accepts_strong_jwt_secret() -> None:
    """Secret acak yang cukup panjang diterima di produksi."""

    settings = Settings(
        environment="production",
        jwt_secret="a" * 32,
        _env_file=None,
    )

    assert settings.environment == "production"


def test_development_allows_default_jwt_secret() -> None:
    """Pengembangan lokal tetap dapat memakai nilai contoh."""

    settings = Settings(
        environment="development",
        jwt_secret=DEFAULT_JWT_SECRET,
        _env_file=None,
    )

    assert settings.jwt_secret == DEFAULT_JWT_SECRET
