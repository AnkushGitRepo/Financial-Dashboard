from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import get_settings

_settings = get_settings()

# NullPool + statement_cache_size=0: each serverless invocation gets its own
# short-lived connection instead of holding a local pool open, and asyncpg's
# prepared-statement cache is disabled — both required for correctness behind
# Neon's PgBouncer-based pooled connection string (transaction-mode pooling
# doesn't support session-level prepared statements). Harmless against a
# plain local Postgres too.
engine = create_async_engine(
    _settings.database_url,
    echo=False,
    pool_pre_ping=True,
    poolclass=NullPool,
    connect_args={"statement_cache_size": 0},
)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_session_factory() as session:
        yield session
