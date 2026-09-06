from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, resolve_company
from app.schemas import StatementType
from app.services import fundamentals_service as svc

router = APIRouter(prefix="/companies", tags=["financials"])


class LineItemOut(BaseModel):
    label: str
    period_type: str
    period_end: date
    value: str | None
    unit: str
    source_tier: str


@router.get("/{symbol}/financials/{statement_type}", response_model=list[LineItemOut])
async def get_financial_statement(
    symbol: str, statement_type: str, session: AsyncSession = Depends(get_db)
) -> list[LineItemOut]:
    try:
        parsed_type = StatementType(statement_type)
    except ValueError as exc:
        valid = ", ".join(t.value for t in StatementType)
        raise HTTPException(
            status_code=422, detail=f"statement_type must be one of: {valid}"
        ) from exc

    company = await resolve_company(symbol, session)
    line_items = await svc.get_financial_statement(session, company, parsed_type)
    return [
        LineItemOut(
            label=i.label,
            period_type=i.period_type,
            period_end=i.period_end,
            value=str(i.value) if i.value is not None else None,
            unit=i.unit,
            source_tier=i.source_tier,
        )
        for i in line_items
    ]
