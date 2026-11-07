"""add dashboard and list indexes

Revision ID: 2e254a09c75e
Revises: 29e652d588ae
Create Date: 2026-11-08 00:46:52.764219

Indexes are created concurrently so writes stay available while they build.
If a concurrent build fails, drop the invalid index manually before rerunning.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "2e254a09c75e"
down_revision: str | None = "29e652d588ae"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_INDEXES = (
    (
        "ix_production_orders_status_completed",
        "production_orders",
        ["status", "completed_at"],
    ),
    ("ix_customers_active_name", "customers", ["is_active", "name"]),
    ("ix_products_active_name", "products", ["is_active", "name"]),
    ("ix_materials_active_name", "materials", ["is_active", "name"]),
    ("ix_materials_category_name", "materials", ["category", "name"]),
    ("ix_users_active_name", "users", ["is_active", "name"]),
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for name, table, columns in _INDEXES:
            op.create_index(
                name,
                table,
                columns,
                unique=False,
                postgresql_concurrently=True,
            )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, table, _ in reversed(_INDEXES):
            op.drop_index(
                name,
                table_name=table,
                postgresql_concurrently=True,
            )
