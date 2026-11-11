"""add production log scrap quantity

Revision ID: c3d4e5f6a7b8
Revises: b1a2c3d4e5f6
Create Date: 2026-11-10 09:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b1a2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "production_logs",
        sa.Column(
            "scrap_qty",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "scrap_non_negative",
        "production_logs",
        "scrap_qty >= 0",
    )
    op.create_check_constraint(
        "quantity_positive",
        "production_logs",
        "output_qty + reject_qty + scrap_qty > 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_production_logs_quantity_positive",
        "production_logs",
        type_="check",
    )
    op.drop_constraint(
        "ck_production_logs_scrap_non_negative",
        "production_logs",
        type_="check",
    )
    op.drop_column("production_logs", "scrap_qty")
