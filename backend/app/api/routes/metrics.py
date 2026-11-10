"""Endpoint metrik Prometheus untuk jaringan internal."""

import secrets

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response

from app.config import get_settings
from app.core.observability.metrics import metrics_content_type, render_metrics

router = APIRouter(tags=["Sistem"])
settings = get_settings()


def _authorized(request: Request) -> bool:
    """Validasi bearer token metrik."""

    if not settings.metrics_token:
        # Tanpa token hanya diizinkan di luar produksi.
        return settings.environment != "production"

    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    return scheme.lower() == "bearer" and secrets.compare_digest(token, settings.metrics_token)


@router.get(
    "/metrics",
    include_in_schema=False,
    summary="Metrik Prometheus (internal)",
)
async def metrics(request: Request) -> Response:
    """Kembalikan metrik Prometheus; dilindungi bearer token."""

    if not settings.metrics_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if not _authorized(request):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tidak diizinkan.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return Response(
        content=render_metrics(),
        headers={"Content-Type": metrics_content_type()},
    )
