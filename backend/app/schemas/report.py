"""Skema laporan produksi."""

from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import OrderStatus
from app.schemas.catalog import CustomerOption
from app.schemas.user import UserOption


class ProductionStage(StrEnum):
    """Tahap produksi yang dapat dicatat pada log."""

    CUTTING = "cutting"
    JAHIT = "jahit"
    FINISHING = "finishing"
    QC = "qc"


class ProductionReportFilters(BaseModel):
    """Filter yang dipakai untuk membangun laporan."""

    start_date: date
    end_date: date
    stage: ProductionStage | None
    order_id: UUID | None


class ProductionReportSummary(BaseModel):
    """Ringkasan output dan kualitas untuk seluruh rentang filter."""

    total_output: int
    total_reject: int
    total_scrap: int
    reject_ratio: float
    scrap_ratio: float
    orders_logged: int
    logs_count: int
    days_count: int


class ProductionReportDaily(BaseModel):
    """Ringkasan output, reject, dan scrap pada satu tanggal log."""

    date: date
    output_qty: int
    reject_qty: int
    scrap_qty: int
    reject_ratio: float
    scrap_ratio: float
    logs_count: int


class ProductionReportStage(BaseModel):
    """Ringkasan output, reject, dan scrap pada satu tahap produksi."""

    stage: ProductionStage
    output_qty: int
    reject_qty: int
    scrap_qty: int
    reject_ratio: float
    scrap_ratio: float
    logs_count: int


class ProductionReportLog(BaseModel):
    """Satu baris log produksi pada laporan."""

    id: UUID
    order_id: UUID
    order_code: str
    customer: CustomerOption | None
    stage: ProductionStage
    log_date: date
    output_qty: int
    reject_qty: int
    scrap_qty: int
    reject_ratio: float
    scrap_ratio: float
    notes: str | None
    created_by: UserOption | None
    created_at: datetime
    order_status: OrderStatus
    order_archived: bool


class ProductionReportLogList(BaseModel):
    """Halaman log produksi pada laporan."""

    items: list[ProductionReportLog]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductionReportResponse(BaseModel):
    """Respons lengkap laporan produksi."""

    filters: ProductionReportFilters
    summary: ProductionReportSummary
    daily: list[ProductionReportDaily]
    stages: list[ProductionReportStage]
    logs: ProductionReportLogList
