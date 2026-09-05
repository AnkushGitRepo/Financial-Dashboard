"""Document references — currently annual reports only, sourced from
Screener's Documents section (which links directly to BSE-hosted PDFs, see
app/ingestion/tier3_screener_scrapling/scraper.py's fetch_annual_reports).

**Known, narrower gap than before:** other document types (XBRL filings,
credit ratings, etc.) still need the Tier 1 filing-discovery step described
in fundamentals_service.py's module docstring — annual reports specifically
didn't need it, since Screener already surfaces the BSE PDF links directly.
"""

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, resolve_company
from app.services import fundamentals_service as svc

router = APIRouter(prefix="/companies", tags=["documents"])


class DocumentOut(BaseModel):
    document_type: str
    title: str
    url: str
    period_end: date | None
    source_tier: str


@router.get("/{symbol}/documents", response_model=list[DocumentOut])
async def get_company_documents(
    symbol: str, session: AsyncSession = Depends(get_db)
) -> list[DocumentOut]:
    company = await resolve_company(symbol, session)
    documents = await svc.get_documents(session, company)
    return [
        DocumentOut(
            document_type=d.document_type,
            title=d.title,
            url=d.url,
            period_end=d.period_end,
            source_tier=d.source_tier,
        )
        for d in documents
    ]
