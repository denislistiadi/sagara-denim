"""Koneksi database dan dependency sesi SQLAlchemy."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.core.observability.logging import install_slow_query_logging
from app.core.observability.metrics import bind_db_pool

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=False,
)
install_slow_query_logging(engine.sync_engine, settings.slow_query_ms)
bind_db_pool(engine.sync_engine.pool)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependency FastAPI yang menyediakan satu sesi per request."""

    async with SessionLocal() as session:
        yield session
