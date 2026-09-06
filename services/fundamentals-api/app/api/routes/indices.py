from fastapi import APIRouter
from pydantic import BaseModel

from app.ingestion.indices import get_all_index_quotes

router = APIRouter(prefix="/indices", tags=["indices"])


class IndexQuoteOut(BaseModel):
    name: str
    value: str
    change: str
    change_pct: str
    spark: list[float]


@router.get("", response_model=list[IndexQuoteOut])
async def get_indices() -> list[IndexQuoteOut]:
    quotes = await get_all_index_quotes()
    return [
        IndexQuoteOut(
            name=q["name"],
            value=str(q["value"]),
            change=str(q["change"]),
            change_pct=str(q["change_pct"]),
            spark=q["spark"],
        )
        for q in quotes
    ]
