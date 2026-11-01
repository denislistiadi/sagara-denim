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
            "API manajemen produksi Sagara Denim. Tahap M1 mencakup "
            "fondasi database dan autentikasi backend."
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
                "name": "Pengguna",
                "description": "Manajemen pengguna; endpoint admin dibatasi peran.",
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
