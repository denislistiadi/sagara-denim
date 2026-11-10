"""Pengujian konfigurasi aplikasi."""

import pytest
from pydantic import ValidationError

from app.config import DEFAULT_JWT_SECRET, Settings


def _production_settings(**overrides) -> Settings:
    values = {
        "environment": "production",
        "jwt_secret": "a" * 32,
        "cookie_secure": True,
        "docs_enabled": False,
        "metrics_token": "m" * 32,
        "public_origin": "https://sagara.example.com",
        "cors_origins": [],
        "_env_file": None,
    }
    values.update(overrides)
    return Settings(**values)


def test_production_rejects_default_jwt_secret() -> None:
    """Secret contoh tidak boleh dipakai di produksi."""

    with pytest.raises(ValidationError, match="JWT_SECRET production"):
        _production_settings(jwt_secret=DEFAULT_JWT_SECRET)


def test_production_rejects_short_jwt_secret() -> None:
    """Secret produksi harus memenuhi panjang minimum."""

    with pytest.raises(ValidationError, match="JWT_SECRET production"):
        _production_settings(jwt_secret="pendek")


def test_production_accepts_complete_profile() -> None:
    """Profil produksi yang lengkap dan aman diterima."""

    settings = _production_settings()

    assert settings.environment == "production"
    assert settings.cookie_secure is True
    assert settings.docs_enabled is False


def test_production_rejects_insecure_cookie() -> None:
    """Cookie produksi wajib Secure."""

    with pytest.raises(ValidationError, match="COOKIE_SECURE"):
        _production_settings(cookie_secure=False)


def test_production_rejects_docs_enabled() -> None:
    """Dokumentasi API harus mati di produksi."""

    with pytest.raises(ValidationError, match="DOCS_ENABLED"):
        _production_settings(docs_enabled=True)


def test_production_rejects_short_metrics_token() -> None:
    """Metrik produksi wajib memakai token yang cukup panjang."""

    with pytest.raises(ValidationError, match="METRICS_TOKEN"):
        _production_settings(metrics_token="pendek")


def test_production_requires_https_public_origin() -> None:
    """Origin publik produksi wajib HTTPS."""

    with pytest.raises(ValidationError, match="PUBLIC_ORIGIN"):
        _production_settings(public_origin="http://sagara.example.com")


def test_production_rejects_localhost_public_origin() -> None:
    """Origin publik produksi tidak boleh localhost."""

    with pytest.raises(ValidationError, match="localhost"):
        _production_settings(public_origin="https://localhost")


def test_production_rejects_cors_origins() -> None:
    """Single origin berarti CORS produksi harus kosong."""

    with pytest.raises(ValidationError, match="CORS_ORIGINS"):
        _production_settings(cors_origins=["https://sagara.example.com"])


def test_development_allows_default_jwt_secret() -> None:
    """Pengembangan lokal tetap dapat memakai nilai contoh."""

    settings = Settings(
        environment="development",
        jwt_secret=DEFAULT_JWT_SECRET,
        _env_file=None,
    )

    assert settings.jwt_secret == DEFAULT_JWT_SECRET


def test_test_profile_disables_login_delay() -> None:
    """Pengujian tidak boleh diperlambat delay progresif."""

    settings = Settings(
        environment="test",
        login_failure_delay_ms=500,
        _env_file=None,
    )

    assert settings.effective_login_failure_delay_ms == 0
