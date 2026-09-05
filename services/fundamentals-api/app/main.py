import logging

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from app.api.routes import companies, documents, financials, indices, prices, search
from app.config import get_settings

logging.basicConfig(level=get_settings().log_level)

app = FastAPI(
    title="MarketMitra Fundamentals API",
    description=(
        "screener.in-style ratios, financial statements, shareholding, and "
        "price history for Indian-listed companies — sourced from a "
        "three-tier free-data fallback chain (see ADR 0011). No paid tier, "
        "no vendor keys required."
    ),
    default_response_class=ORJSONResponse,
)

app.include_router(companies.router)
app.include_router(financials.router)
app.include_router(prices.router)
app.include_router(documents.router)
app.include_router(indices.router)
app.include_router(search.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
