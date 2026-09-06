from collections.abc import AsyncIterator

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CompanyORM
from app.db.session import get_session
from app.services.fundamentals_service import get_or_create_company

DbSession = AsyncIterator[AsyncSession]


async def get_db() -> DbSession:
    async for session in get_session():
        yield session


async def resolve_company(symbol: str, session: AsyncSession) -> CompanyORM:
    """`symbol` is treated as an NSE symbol (the common case). BSE-code-only
    companies aren't reachable through this path yet — a real, tracked gap;
    see ROADMAP.md Phase 4."""
    try:
        return await get_or_create_company(session, nse_symbol=symbol.upper())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"could not resolve company {symbol!r}: {exc}") from exc
