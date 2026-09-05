from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, resolve_company
from app.services import fundamentals_service as svc

router = APIRouter(prefix="/companies", tags=["prices"])


class PricePointOut(BaseModel):
    trade_date: date
    open: str | None
    high: str | None
    low: str | None
    close: str | None
    volume: int | None
    source_tier: str


@router.get("/{symbol}/prices", response_model=list[PricePointOut])
async def get_price_history(
    symbol: str,
    period: str = Query(default="1y", description="yfinance-style period, e.g. 1mo/6mo/1y/5y"),
    session: AsyncSession = Depends(get_db),
) -> list[PricePointOut]:
    company = await resolve_company(symbol, session)
    points = await svc.get_price_history(session, company, period=period)
    return [
        PricePointOut(
            trade_date=p.trade_date,
            open=str(p.open) if p.open is not None else None,
            high=str(p.high) if p.high is not None else None,
            low=str(p.low) if p.low is not None else None,
            close=str(p.close) if p.close is not None else None,
            volume=p.volume,
            source_tier=p.source_tier,
        )
        for p in points
    ]
