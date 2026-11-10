"""Konfigurasi aplikasi dari variabel lingkungan."""

from functools import lru_cache
from typing import Literal, Self
from urllib.parse import urlparse

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "ganti-secret-ini-sebelum-produksi-minimal-32-karakter"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
LOG_LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")


class Settings(BaseSettings):
    """Pengaturan aplikasi.

    Semua nilai dapat ditimpa melalui `.env` atau variabel lingkungan.
    Profil `production` divalidasi secara ketat agar konfigurasi yang tidak
    aman gagal sebelum aplikasi menerima request.
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
    public_origin: str | None = None

    docs_enabled: bool = True
    metrics_enabled: bool = True
    metrics_token: str = ""

    login_max_failures_email: int = Field(default=5, ge=1, le=100)
    login_max_failures_ip: int = Field(default=20, ge=1, le=1000)
    login_window_minutes: int = Field(default=15, ge=1, le=1440)
    login_block_minutes: int = Field(default=15, ge=1, le=1440)
    login_failure_delay_ms: int = Field(default=50, ge=0, le=5000)

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

    @field_validator("public_origin")
    @classmethod
    def normalize_public_origin(cls, value: str | None) -> str | None:
        """Normalisasi origin publik tanpa trailing slash."""

        if value is None:
            return None

        origin = value.strip().rstrip("/")
        if not origin:
            return None

        parsed = urlparse(origin)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("PUBLIC_ORIGIN harus berupa origin HTTP/HTTPS yang valid.")
        if parsed.path or parsed.params or parsed.query or parsed.fragment:
            raise ValueError("PUBLIC_ORIGIN tidak boleh memuat path, query, atau fragment.")

        return origin

    @property
    def effective_login_failure_delay_ms(self) -> int:
        """Matikan delay progresif saat pengujian agar tetap cepat."""

        if self.environment == "test":
            return 0
        return self.login_failure_delay_ms

    @model_validator(mode="after")
    def validate_production_profile(self) -> Self:
        """Tolak konfigurasi produksi yang tidak aman."""

        if self.environment != "production":
            return self

        if self.jwt_secret == DEFAULT_JWT_SECRET or len(self.jwt_secret) < 32:
            raise ValueError(
                "JWT_SECRET production wajib diisi dengan nilai acak minimal 32 karakter."
            )

        if not self.cookie_secure:
            raise ValueError("COOKIE_SECURE production wajib bernilai true.")

        if self.cookie_samesite == "none":
            raise ValueError("COOKIE_SAMESITE production tidak boleh none pada single origin.")

        if self.docs_enabled:
            raise ValueError("DOCS_ENABLED production wajib false agar dokumentasi API mati.")

        if not self.metrics_enabled:
            raise ValueError("METRICS_ENABLED production wajib true untuk observability.")

        if len(self.metrics_token.strip()) < 32:
            raise ValueError("METRICS_TOKEN production wajib diisi minimal 32 karakter.")

        if self.public_origin is None:
            raise ValueError("PUBLIC_ORIGIN production wajib diisi.")

        parsed = urlparse(self.public_origin)
        if parsed.scheme != "https":
            raise ValueError("PUBLIC_ORIGIN production wajib memakai HTTPS.")
        if parsed.hostname in LOCAL_HOSTS:
            raise ValueError("PUBLIC_ORIGIN production tidak boleh menunjuk ke localhost.")

        if self.cors_origins:
            raise ValueError(
                "CORS_ORIGINS production wajib kosong karena aplikasi memakai single origin."
            )

        return self


@lru_cache
def get_settings() -> Settings:
    """Kembalikan instance pengaturan yang di-cache."""

    return Settings()
