"""Enumerasi domain produksi."""

from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    OPERATOR = "operator"
    QC = "qc"


class OrderStatus(StrEnum):
    MENUNGGU = "menunggu"
    CUTTING = "cutting"
    JAHIT = "jahit"
    FINISHING = "finishing"
    QC = "qc"
    SELESAI = "selesai"
    DIBATALKAN = "dibatalkan"


class Priority(StrEnum):
    TINGGI = "tinggi"
    NORMAL = "normal"
    RENDAH = "rendah"


class StockMovementType(StrEnum):
    MASUK = "masuk"
    KELUAR = "keluar"
    PENYESUAIAN = "penyesuaian"
