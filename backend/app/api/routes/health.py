"""Endpoint kesehatan."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.config import get_settings
from app.db import get_session
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Sistem"])
settings = get_settings()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Periksa kesehatan API dan database",
)
async def health(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HealthResponse:
    """Kembalikan status API dan koneksi database."""

    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database tidak dapat dihubungi.",
        ) from exc

    return HealthResponse(
        status="ok",
        database="ok",
        app=settings.app_name,
        version=__version__,
    )
