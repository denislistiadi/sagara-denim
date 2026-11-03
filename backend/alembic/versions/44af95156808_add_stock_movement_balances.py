"""add stock movement balances

Revision ID: 44af95156808
Revises: 33c3d7c1c980
Create Date: 2026-11-04 16:57:40.256119

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "44af95156808"
down_revision: str | None = "33c3d7c1c980"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "stock_movements",
        sa.Column("stock_before", sa.Numeric(precision=12, scale=2), nullable=True),
    )
    op.add_column(
        "stock_movements",
        sa.Column("stock_after", sa.Numeric(precision=12, scale=2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("stock_movements", "stock_after")
    op.drop_column("stock_movements", "stock_before")
