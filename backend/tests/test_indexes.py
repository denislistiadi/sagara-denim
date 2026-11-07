"""Pengujian definisi index database."""

from app.models import Customer, Material, Product, ProductionOrder, User

EXPECTED_INDEXES = {
    Customer.__table__: {
        "ix_customers_active_name": ["is_active", "name"],
    },
    Product.__table__: {
        "ix_products_active_name": ["is_active", "name"],
    },
    Material.__table__: {
        "ix_materials_active_name": ["is_active", "name"],
        "ix_materials_category_name": ["category", "name"],
    },
    User.__table__: {
        "ix_users_active_name": ["is_active", "name"],
    },
    ProductionOrder.__table__: {
        "ix_production_orders_status_completed": ["status", "completed_at"],
    },
}


def test_expected_indexes_are_defined() -> None:
    for table, expected in EXPECTED_INDEXES.items():
        indexes = {index.name: index for index in table.indexes}
        for name, columns in expected.items():
            assert name in indexes, f"{name} tidak terdefinisi pada {table.name}"
            assert [column.name for column in indexes[name].columns] == columns
