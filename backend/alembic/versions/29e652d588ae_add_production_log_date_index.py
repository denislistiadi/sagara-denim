"""add production log date index

Revision ID: 29e652d588ae
Revises: 44af95156808
Create Date: 2026-11-05 02:06:45.029800

"""

from collections.abc import Sequence

from alembic import op

revision: str = "29e652d588ae"
down_revision: str | None = "44af95156808"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_production_logs_log_date",
        "production_logs",
        ["log_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_production_logs_log_date", table_name="production_logs")
