from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, resolve_company
from app.services import fundamentals_service as svc

router = APIRouter(prefix="/companies", tags=["companies"])


class CompanyOut(BaseModel):
    symbol: str
    name: str
    industry: str | None
    sector: str | None
    source_tier: str | None


class RatioOut(BaseModel):
    name: str
    value: str | None
    unit: str | None
    as_of: date
    source_tier: str


class ShareholdingOut(BaseModel):
    category: str
    percentage: str
    quarter_end: date
    source_tier: str


@router.get("/{symbol}", response_model=CompanyOut)
async def get_company(symbol: str, session: AsyncSession = Depends(get_db)) -> CompanyOut:
    company = await resolve_company(symbol, session)
    return CompanyOut(
        symbol=company.nse_symbol or company.bse_code or symbol,
        name=company.name,
        industry=company.industry,
        sector=company.sector,
        source_tier=company.source_tier,
    )


@router.get("/{symbol}/ratios", response_model=list[RatioOut])
async def get_company_ratios(symbol: str, session: AsyncSession = Depends(get_db)) -> list[RatioOut]:
    company = await resolve_company(symbol, session)
    ratios = await svc.get_ratios(session, company)
    return [
        RatioOut(
            name=r.name,
            value=str(r.value) if r.value is not None else None,
            unit=r.unit,
            as_of=r.as_of,
            source_tier=r.source_tier,
        )
        for r in ratios
    ]


@router.get("/{symbol}/shareholding", response_model=list[ShareholdingOut])
async def get_company_shareholding(
    symbol: str, session: AsyncSession = Depends(get_db)
) -> list[ShareholdingOut]:
    company = await resolve_company(symbol, session)
    entries = await svc.get_shareholding(session, company)
    return [
        ShareholdingOut(
            category=e.category,
            percentage=str(e.percentage),
            quarter_end=e.quarter_end,
            source_tier=e.source_tier,
        )
        for e in entries
    ]
