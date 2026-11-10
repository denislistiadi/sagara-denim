"""Entrypoint aplikasi FastAPI."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app import __version__
from app.api.router import api_router
from app.config import get_settings
from app.core.observability.logging import configure_logging
from app.core.observability.middleware import RequestContextMiddleware
from app.core.security.headers import SecurityHeadersMiddleware
from app.core.security.origin import OriginCheckMiddleware
from app.db import engine

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Tutup pool koneksi saat aplikasi berhenti."""

    yield
    await engine.dispose()


def create_app() -> FastAPI:
    """Bangun instance aplikasi."""

    configure_logging(settings.log_level)

    docs_url = "/docs" if settings.docs_enabled else None
    redoc_url = "/redoc" if settings.docs_enabled else None
    openapi_url = "/openapi.json" if settings.docs_enabled else None

    application = FastAPI(
        title=settings.app_name,
        description=(
            "API manajemen produksi Sagara Denim. Mencakup autentikasi, "
            "dashboard, data master pelanggan/produk/pengguna, perintah produksi "
            "beserta workflow dan production log, inventori bahan dengan mutasi "
            "stok, serta laporan produksi dan export CSV."
        ),
        version=__version__,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
        openapi_tags=[
            {"name": "Sistem", "description": "Status aplikasi dan database."},
            {
                "name": "Autentikasi",
                "description": "Login, refresh token, logout, dan profil sesi.",
            },
            {
                "name": "Dashboard",
                "description": "Ringkasan KPI dan metrik produksi.",
            },
            {
                "name": "Pengguna",
                "description": "Manajemen pengguna; endpoint admin dibatasi peran.",
            },
            {
                "name": "Pelanggan",
                "description": "Pilihan pelanggan aktif untuk perintah produksi.",
            },
            {
                "name": "Produk",
                "description": "Pilihan model produk aktif untuk item produksi.",
            },
            {
                "name": "Perintah Produksi",
                "description": ("Pembuatan, perubahan, arsip, dan detail perintah produksi."),
            },
            {
                "name": "Bahan & Aksesoris",
                "description": "Inventori bahan, aksesoris, dan pergerakan stok.",
            },
            {
                "name": "Laporan",
                "description": "Rekap output, reject, dan export CSV produksi.",
            },
        ],
    )

    allowed_origins = set(settings.cors_origins)
    if settings.public_origin:
        allowed_origins.add(settings.public_origin)

    # Urutan add_middleware: yang terakhir ditambahkan berada paling luar.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(GZipMiddleware, minimum_size=1024)
    application.add_middleware(
        OriginCheckMiddleware,
        allowed_origins=allowed_origins,
    )
    application.add_middleware(
        SecurityHeadersMiddleware,
        production=settings.environment == "production",
    )
    application.add_middleware(
        RequestContextMiddleware,
        health_path=f"{settings.api_prefix}/health",
        route_prefix=settings.api_prefix,
    )

    application.include_router(api_router, prefix=settings.api_prefix)

    @application.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "app": settings.app_name,
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health/ready",
        }

    return application


app = create_app()
