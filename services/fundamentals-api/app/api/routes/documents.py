"""Document references (annual reports, XBRL filings, etc.).

**Known gap:** nothing populates `document_references` yet — that needs the
Tier 1 filing-discovery step described in fundamentals_service.py's module
docstring (find the latest filing URLs for a company), which hasn't been
built. This endpoint is real and ready to serve once that ingestion exists;
today it will always return an empty list.
"""

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, resolve_company
from app.db.models import DocumentReferenceORM

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
    stmt = select(DocumentReferenceORM).where(DocumentReferenceORM.company_id == company.id)
    documents = list((await session.execute(stmt)).scalars())
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
