"""Endpoint ringkasan dashboard."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard as service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "",
    response_model=DashboardSummary,
    summary="Ringkasan dashboard produksi",
)
async def get_dashboard(
    _: CurrentUser,
    session: SessionDep,
) -> DashboardSummary:
    """Kembalikan seluruh data dashboard dalam satu request."""

    return await service.build_dashboard(session)
