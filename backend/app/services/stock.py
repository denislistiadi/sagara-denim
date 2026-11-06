"""Aturan status dan persentase stok yang dipakai bersama."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import and_, case

from app.models import Material
from app.schemas.material import StockStatus


def stock_status(stock_qty: Decimal, minimum_stock: Decimal) -> StockStatus:
    """Hitung status stok sesuai ambang yang disepakati."""

    if stock_qty <= 0:
        return StockStatus.HABIS
    if minimum_stock > 0 and stock_qty <= minimum_stock * Decimal("0.5"):
        return StockStatus.KRITIS
    if stock_qty < minimum_stock:
        return StockStatus.MENIPIS
    return StockStatus.AMAN


def stock_status_case():
    """Ekspresi SQL untuk memfilter status stok."""

    return case(
        (Material.stock_qty <= 0, StockStatus.HABIS.value),
        (
            and_(
                Material.minimum_stock > 0,
                Material.stock_qty <= Material.minimum_stock * Decimal("0.5"),
            ),
            StockStatus.KRITIS.value,
        ),
        (Material.stock_qty < Material.minimum_stock, StockStatus.MENIPIS.value),
        else_=StockStatus.AMAN.value,
    )


def stock_percent(stock_qty: Decimal, minimum_stock: Decimal) -> int:
    """Hitung persentase stok terhadap batas minimum, dibatasi 0–100."""

    if minimum_stock <= 0:
        return 100 if stock_qty > 0 else 0

    percent = round(float(stock_qty) * 100 / float(minimum_stock))
    return min(100, max(0, percent))
