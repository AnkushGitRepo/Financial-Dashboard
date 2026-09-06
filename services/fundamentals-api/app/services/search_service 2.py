"""Search across every NSE-listed equity plus the tracked indices — "all
the stocks and indices the Indian market has," not just whatever companies
have already been queried once (see app/ingestion/company_master.py)."""

from __future__ import annotations

import logging

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CompanyMasterORM
from app.ingestion.company_master import fetch_equity_list
from app.ingestion.indices import TRACKED_INDICES

logger = logging.getLogger("fundamentals.search")


async def ensure_company_master_populated(session: AsyncSession) -> None:
    count = await session.scalar(select(func.count()).select_from(CompanyMasterORM))
    if count:
        return

    companies = await fetch_equity_list()
    if not companies:
        logger.warning("could not populate company_master — NSE equity list fetch failed")
        return

    for company in companies:
        stmt = (
            insert(CompanyMasterORM)
            .values(symbol=company["symbol"], name=company["name"])
            .on_conflict_do_update(index_elements=["symbol"], set_={"name": company["name"]})
        )
        await session.execute(stmt)
    await session.commit()
    logger.info("populated company_master with %d symbols", len(companies))


async def search(session: AsyncSession, query: str, limit: int = 15) -> list[dict]:
    query = query.strip()
    if not query:
        return []

    results: list[dict] = []
    query_upper = query.upper()
    for name, yahoo_symbol in TRACKED_INDICES.items():
        if query_upper in name.upper():
            results.append({"type": "index", "symbol": yahoo_symbol, "name": name})

    stmt = (
        select(CompanyMasterORM)
        .where(
            or_(
                CompanyMasterORM.symbol.ilike(f"{query}%"),
                CompanyMasterORM.name.ilike(f"%{query}%"),
            )
        )
        # exact/prefix symbol matches first, then alphabetical
        .order_by(
            (CompanyMasterORM.symbol.ilike(query)).desc(),
            (CompanyMasterORM.symbol.ilike(f"{query}%")).desc(),
            CompanyMasterORM.symbol,
        )
        .limit(limit)
    )
    companies = (await session.execute(stmt)).scalars().all()
    results.extend({"type": "company", "symbol": c.symbol, "name": c.name} for c in companies)

    return results[:limit]
