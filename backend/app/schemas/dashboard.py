"""Skema ringkasan dashboard."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import OrderStatus, Priority
from app.schemas.material import StockStatus
from app.schemas.report import ProductionStage


class DashboardKpis(BaseModel):
    """Angka utama yang ditampilkan pada kartu dashboard."""

    active_orders: int
    new_orders_today: int
    today_output: int
    yesterday_output: int
    today_reject: int
    today_reject_ratio: float
    on_time_delivery_ratio: float | None
    completed_orders_30d: int
    on_time_orders_30d: int


class DashboardDailyOutput(BaseModel):
    """Total output pada satu tanggal."""

    date: date
    output_qty: int


class DashboardRejectStage(BaseModel):
    """Total reject pada satu tahap produksi."""

    stage: ProductionStage
    reject_qty: int


class DashboardPipelineStage(BaseModel):
    """Jumlah order aktif pada satu status."""

    status: OrderStatus
    order_count: int
    total_quantity: int


class DashboardDeadline(BaseModel):
    """Order aktif yang mendekati atau melewati deadline."""

    id: UUID
    code: str
    model_summary: str
    customer_name: str | None
    deadline: date
    priority: Priority
    status: OrderStatus
    is_overdue: bool


class DashboardStockItem(BaseModel):
    """Bahan aktif yang berada di bawah batas aman."""

    id: UUID
    sku: str
    name: str
    category: str
    unit: str
    stock_qty: Decimal
    minimum_stock: Decimal
    status: StockStatus
    percent: int


class DashboardSummary(BaseModel):
    """Respons lengkap satu halaman dashboard."""

    business_date: date
    generated_at: datetime
    kpis: DashboardKpis
    daily_output: list[DashboardDailyOutput]
    reject_breakdown: list[DashboardRejectStage]
    pipeline: list[DashboardPipelineStage]
    upcoming_deadlines: list[DashboardDeadline]
    critical_stock: list[DashboardStockItem]
