"""Entrypoint aplikasi FastAPI."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.router import api_router
from app.config import get_settings
from app.db import engine

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Tutup pool koneksi saat aplikasi berhenti."""

    yield
    await engine.dispose()


def create_app() -> FastAPI:
    """Bangun instance aplikasi."""

    application = FastAPI(
        title=settings.app_name,
        description=(
            "API manajemen produksi Sagara Denim. Mencakup autentikasi, "
            "dashboard, data master pelanggan/produk/pengguna, perintah produksi "
            "beserta workflow dan production log, inventori bahan dengan mutasi "
            "stok, serta laporan produksi dan export CSV."
        ),
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
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

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router, prefix=settings.api_prefix)

    @application.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "app": settings.app_name,
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health",
        }

    return application


app = create_app()
