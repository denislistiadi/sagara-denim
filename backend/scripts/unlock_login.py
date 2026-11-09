"""Buka blokir rate limit login.

Contoh:
    python scripts/unlock_login.py --email admin@sagara.co.id
    python scripts/unlock_login.py --ip 203.0.113.10
    python scripts/unlock_login.py --all
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, or_  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import LoginAttempt  # noqa: E402
from app.services.rate_limit import PostgresLoginRateLimiter  # noqa: E402


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Hapus state rate limit login untuk email, IP, atau semua.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--email", help="Email yang akan dibuka blokirnya.")
    group.add_argument("--ip", help="Alamat IP yang akan dibuka blokirnya.")
    group.add_argument("--all", action="store_true", help="Hapus semua state rate limit.")
    return parser


async def _run(args: argparse.Namespace) -> int:
    limiter = PostgresLoginRateLimiter()

    async with SessionLocal() as session:
        if args.all:
            result = await session.execute(delete(LoginAttempt))
        else:
            conditions = []
            if args.email:
                conditions.append(
                    LoginAttempt.key_hash == limiter.key_hash(args.email.strip().lower())
                )
            if args.ip:
                conditions.append(LoginAttempt.key_hash == limiter.key_hash(args.ip.strip()))
            result = await session.execute(delete(LoginAttempt).where(or_(*conditions)))

        await session.commit()
        return int(result.rowcount or 0)


def main() -> None:
    args = _parser().parse_args()
    removed = asyncio.run(_run(args))
    print(f"OK: {removed} baris state rate limit dihapus.")


if __name__ == "__main__":
    main()
