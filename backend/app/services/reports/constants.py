"""Label dan urutan tahap pada laporan produksi."""

from app.models import OrderStatus
from app.schemas.report import ProductionStage

STAGE_ORDER = (
    ProductionStage.CUTTING,
    ProductionStage.JAHIT,
    ProductionStage.FINISHING,
    ProductionStage.QC,
)

STAGE_TO_STATUS = {
    ProductionStage.CUTTING: OrderStatus.CUTTING,
    ProductionStage.JAHIT: OrderStatus.JAHIT,
    ProductionStage.FINISHING: OrderStatus.FINISHING,
    ProductionStage.QC: OrderStatus.QC,
}

STAGE_LABELS = {
    ProductionStage.CUTTING: "Cutting",
    ProductionStage.JAHIT: "Jahit",
    ProductionStage.FINISHING: "Finishing",
    ProductionStage.QC: "QC",
}

STATUS_LABELS = {
    OrderStatus.MENUNGGU: "Menunggu",
    OrderStatus.CUTTING: "Cutting",
    OrderStatus.JAHIT: "Jahit",
    OrderStatus.FINISHING: "Finishing",
    OrderStatus.QC: "QC",
    OrderStatus.SELESAI: "Selesai",
    OrderStatus.DIBATALKAN: "Dibatalkan",
}

CSV_HEADER = (
    "Tanggal Log",
    "Kode Order",
    "Pelanggan",
    "Tahap",
    "Output",
    "Reject",
    "Rasio Reject (%)",
    "Status Order",
    "Order Diarsipkan",
    "Catatan",
    "Dicatat Oleh",
    "Waktu Input (WIB)",
)
