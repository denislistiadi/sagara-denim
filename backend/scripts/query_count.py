"""Ukur jumlah query dan latensi baseline layanan baca utama.

Skrip ini membuat ulang skema pada database uji, mengisi data representatif,
lalu mencatat jumlah statement SQL serta waktu eksekusi setiap layanan.

Jalankan dari direktori ``backend``:

    .venv\\Scripts\\python.exe scripts\\query_count.py

Secara default skrip memakai ``TEST_DATABASE_URL``. Database utama hanya boleh
dipakai dengan ``--database-url`` dan ``--force`` karena skrip menghapus skema.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.core.time import WIB  # noqa: E402
from app.models import Base  # noqa: E402
from app.services.dashboard import build_dashboard  # noqa: E402
from app.services.materials import list_materials  # noqa: E402
from app.services.production_orders import list_orders, list_queue  # noqa: E402
from app.services.reports import (  # noqa: E402
    build_production_report,
    build_production_report_csv,
)
from scripts.baseline_dataset import seed  # noqa: E402


@dataclass
class Measurement:
    """Satu hasil pengukuran layanan."""

    label: str
    queries: int
    duration_ms: float
    detail: str


class QueryCounter:
    """Penghitung statement SQL melalui event SQLAlchemy."""

    def __init__(self) -> None:
        self.count = 0

    def __call__(self, *args: Any, **kwargs: Any) -> None:
        self.count += 1


async def measure(
    label: str,
    session: AsyncSession,
    counter: QueryCounter,
    call: Callable[[], Awaitable[Any]],
    describe: Callable[[Any], str],
) -> Measurement:
    """Jalankan satu layanan dan catat query serta waktunya."""

    session.expire_all()
    counter.count = 0
    started = time.perf_counter()
    result = await call()
    duration_ms = (time.perf_counter() - started) * 1000
    return Measurement(label, counter.count, duration_ms, describe(result))


async def run(database_url: str, keep_data: bool) -> list[Measurement]:
    """Siapkan data, ukur semua layanan, lalu bersihkan skema."""

    engine: AsyncEngine = create_async_engine(database_url, pool_pre_ping=True)
    counter = QueryCounter()
    event.listen(engine.sync_engine, "before_cursor_execute", counter)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    today = datetime.now(UTC).astimezone(WIB).date()
    start_date = today - timedelta(days=29)

    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)

        async with factory() as session:
            summary = await seed(session)
            print(f"Dataset: {summary}\n")

            return [
                await measure(
                    "build_dashboard",
                    session,
                    counter,
                    lambda: build_dashboard(session, now=datetime.now(UTC)),
                    lambda result: (
                        f"{len(result.critical_stock)} stok kritis, "
                        f"{len(result.upcoming_deadlines)} deadline"
                    ),
                ),
                await measure(
                    "list_queue",
                    session,
                    counter,
                    lambda: list_queue(session, limit_per_stage=6),
                    lambda result: f"{result.total_orders} order / {len(result.stages)} tahap",
                ),
                await measure(
                    "list_orders",
                    session,
                    counter,
                    lambda: list_orders(session, page=1, page_size=20),
                    lambda result: f"{result.total} total, {len(result.items)} baris",
                ),
                await measure(
                    "list_materials",
                    session,
                    counter,
                    lambda: list_materials(session, page=1, page_size=20),
                    lambda result: f"{result.total} total, {len(result.items)} baris",
                ),
                await measure(
                    "build_production_report",
                    session,
                    counter,
                    lambda: build_production_report(
                        session,
                        start_date=start_date,
                        end_date=today,
                        stage=None,
                        order_id=None,
                        page=1,
                        page_size=20,
                    ),
                    lambda result: f"{result.logs.total} log, {len(result.logs.items)} baris",
                ),
                await measure(
                    "build_production_report_csv",
                    session,
                    counter,
                    lambda: build_production_report_csv(
                        session,
                        start_date=start_date,
                        end_date=today,
                        stage=None,
                        order_id=None,
                    ),
                    lambda result: (
                        f"{len(result[0]):,} karakter, seluruh baris di memori"
                    ),
                ),
            ]
    finally:
        if not keep_data:
            async with engine.begin() as connection:
                await connection.run_sync(Base.metadata.drop_all)
        await engine.dispose()


def print_report(measurements: list[Measurement]) -> None:
    """Cetak tabel hasil pengukuran."""

    print(f"{'Layanan':<30} {'Query':>5} {'Waktu (ms)':>11}  Detail")
    print("-" * 82)
    for item in measurements:
        print(
            f"{item.label:<30} {item.queries:>5} {item.duration_ms:>11.1f}  {item.detail}"
        )


def parse_args() -> argparse.Namespace:
    """Baca argumen command line."""

    settings = get_settings()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database-url",
        default=None,
        help="URL database; default memakai TEST_DATABASE_URL.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Izinkan skrip menghapus skema pada DATABASE_URL utama.",
    )
    parser.add_argument(
        "--keep-data",
        action="store_true",
        help="Jangan hapus skema setelah pengukuran.",
    )
    args = parser.parse_args()
    args.database_url = args.database_url or settings.test_database_url
    if not args.database_url:
        parser.error("TEST_DATABASE_URL kosong; isi --database-url secara eksplisit.")
    if args.database_url == settings.database_url and not args.force:
        parser.error("URL tersebut DATABASE_URL utama; tambahkan --force bila yakin.")
    return args


def main() -> None:
    """Entry point skrip."""

    args = parse_args()
    measurements = asyncio.run(run(args.database_url, args.keep_data))
    print_report(measurements)


if __name__ == "__main__":
    main()
