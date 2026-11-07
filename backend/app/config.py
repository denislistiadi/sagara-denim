"""Konfigurasi aplikasi dari variabel lingkungan."""

from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "ganti-secret-ini-sebelum-produksi-minimal-32-karakter"
LOG_LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")


class Settings(BaseSettings):
    """Pengaturan aplikasi.

    Semua nilai dapat ditimpa melalui `.env` atau variabel lingkungan.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Sagara Denim API"
    environment: Literal["development", "test", "production"] = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql+asyncpg://sagara:sagara@localhost:5432/sagara_denim"
    test_database_url: str | None = (
        "postgresql+asyncpg://sagara:sagara@localhost:5432/sagara_denim_test"
    )

    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "sagara-denim"
    jwt_audience: str = "sagara-denim-web"
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    access_cookie_name: str = "sagara_access"
    refresh_cookie_name: str = "sagara_refresh"

    cors_origins: list[str] = ["http://localhost:3000"]

    log_level: str = "INFO"
    slow_query_ms: int = Field(default=200, ge=0)

    seed_admin_email: str = "admin@sagara.co.id"
    seed_admin_password: str = "Admin#2026"
    seed_operator_email: str = "operator@sagara.co.id"
    seed_operator_password: str = "Operator#2026"
    seed_qc_email: str = "qc@sagara.co.id"
    seed_qc_password: str = "QC#2026"

    @field_validator("log_level")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        """Terima level logging tanpa membedakan huruf besar/kecil."""

        level = value.strip().upper()
        if level not in LOG_LEVELS:
            raise ValueError(f"LOG_LEVEL harus salah satu dari {', '.join(LOG_LEVELS)}.")
        return level

    @model_validator(mode="after")
    def validate_production_secret(self) -> Self:
        """Tolak secret default atau lemah saat berjalan di produksi."""

        if self.environment == "production":
            if self.jwt_secret == DEFAULT_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError(
                    "JWT_SECRET production wajib diisi dengan nilai acak minimal 32 karakter."
                )

        return self


@lru_cache
def get_settings() -> Settings:
    """Kembalikan instance pengaturan yang di-cache."""

    return Settings()
