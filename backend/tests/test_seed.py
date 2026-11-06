"""Pengujian guard seed demo."""

import pytest

from app.seed import ensure_seed_allowed


@pytest.mark.parametrize("environment", ["development", "test"])
def test_seed_allowed_outside_production(environment: str) -> None:
    """Seed boleh berjalan di lingkungan pengembangan dan pengujian."""

    ensure_seed_allowed(environment)


def test_seed_rejected_in_production() -> None:
    """Seed demo tidak boleh berjalan di produksi."""

    with pytest.raises(RuntimeError, match="production"):
        ensure_seed_allowed("production")
