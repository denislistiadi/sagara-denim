"""Endpoint laporan produksi."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_session
from app.schemas.report import ProductionReportResponse, ProductionStage
from app.services import reports as service

router = APIRouter(prefix="/reports", tags=["Laporan"])


def _validate_range(start_date: date, end_date: date) -> None:
    """Pastikan rentang tanggal tidak terbalik."""

    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Tanggal awal tidak boleh melebihi tanggal akhir.",
        )


@router.get(
    "/production",
    response_model=ProductionReportResponse,
    summary="Laporan produksi",
    responses={
        422: {"description": "Rentang tanggal, tahap, atau pagination tidak valid."},
    },
)
async def get_production_report(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    start_date: Annotated[date, Query(description="Tanggal awal laporan (inklusif).")],
    end_date: Annotated[date, Query(description="Tanggal akhir laporan (inklusif).")],
    stage: Annotated[
        ProductionStage | None,
        Query(description="Filter tahap produksi."),
    ] = None,
    order_id: Annotated[
        UUID | None,
        Query(description="Filter perintah produksi."),
    ] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ProductionReportResponse:
    """Kembalikan ringkasan dan tabel log produksi sesuai filter."""

    _validate_range(start_date, end_date)

    return await service.build_production_report(
        session,
        start_date=start_date,
        end_date=end_date,
        stage=stage,
        order_id=order_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/production/export",
    response_class=Response,
    summary="Export laporan produksi CSV",
    responses={
        200: {
            "description": "Berkas CSV laporan produksi.",
            "content": {"text/csv": {}},
        },
        422: {"description": "Rentang tanggal atau tahap tidak valid."},
    },
)
async def export_production_report(
    _: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    start_date: Annotated[date, Query(description="Tanggal awal laporan (inklusif).")],
    end_date: Annotated[date, Query(description="Tanggal akhir laporan (inklusif).")],
    stage: Annotated[
        ProductionStage | None,
        Query(description="Filter tahap produksi."),
    ] = None,
    order_id: Annotated[
        UUID | None,
        Query(description="Filter perintah produksi."),
    ] = None,
) -> Response:
    """Unduh seluruh baris log produksi yang cocok dengan filter sebagai CSV."""

    _validate_range(start_date, end_date)

    content, filename = await service.build_production_report_csv(
        session,
        start_date=start_date,
        end_date=end_date,
        stage=stage,
        order_id=order_id,
    )

    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
