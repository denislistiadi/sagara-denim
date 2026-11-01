"""Fixture pengujian backend."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.core.security import hash_password
from app.db import get_session
from app.main import app
from app.models import Base, User, UserRole

settings = get_settings()


@pytest.fixture(scope="session")
async def test_engine() -> AsyncIterator[AsyncEngine]:
    """Siapkan skema database uji sekali per sesi."""

    url = settings.test_database_url or settings.database_url
    engine = create_async_engine(url, pool_pre_ping=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def session(test_engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Sesi database untuk satu pengujian."""

    factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with factory() as db_session:
        yield db_session


@pytest.fixture(autouse=True)
async def clean_tables(test_engine: AsyncEngine) -> AsyncIterator[None]:
    """Kosongkan seluruh tabel setelah setiap pengujian."""

    yield

    table_names = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
    async with test_engine.begin() as connection:
        await connection.execute(text(f"TRUNCATE {table_names} RESTART IDENTITY CASCADE"))


@pytest.fixture
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """Klien HTTP yang memakai sesi database uji."""

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as http_client:
        yield http_client

    app.dependency_overrides.clear()


@pytest.fixture
async def users(session: AsyncSession) -> dict[str, User]:
    """Tiga pengguna demo dengan peran berbeda."""

    admin = User(
        email=settings.seed_admin_email,
        name="Admin Produksi",
        password_hash=hash_password(settings.seed_admin_password),
        role=UserRole.ADMIN,
    )
    operator = User(
        email=settings.seed_operator_email,
        name="Raka Pratama",
        password_hash=hash_password(settings.seed_operator_password),
        role=UserRole.OPERATOR,
    )
    qc = User(
        email=settings.seed_qc_email,
        name="Sinta Maharani",
        password_hash=hash_password(settings.seed_qc_password),
        role=UserRole.QC,
    )

    session.add_all([admin, operator, qc])
    await session.commit()

    return {"admin": admin, "operator": operator, "qc": qc}
