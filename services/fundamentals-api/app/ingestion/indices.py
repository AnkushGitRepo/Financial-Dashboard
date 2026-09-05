"""Real Indian market index quotes, via yfinance (Tier 2).

Indices aren't companies, so they don't go through the company-keyed
three-tier fallback chain — Yahoo Finance is the only one of our three
sources that carries index-level data at all (NSE/BSE's own endpoints are
company/security-keyed; Screener.in is company-fundamentals-only). Served
live on each request rather than cached in Postgres: index quotes are
low-cost to fetch and change constantly, so a cache would mostly just add
staleness risk for little benefit.
"""

from __future__ import annotations

import asyncio
import logging
import math
from decimal import Decimal

import yfinance as yf

logger = logging.getLogger("fundamentals.indices")

# name -> Yahoo Finance ticker for the index.
TRACKED_INDICES: dict[str, str] = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "NIFTY BANK": "^NSEBANK",
    "INDIA VIX": "^INDIAVIX",
}


def _safe_decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        d = Decimal(str(value))
    except Exception:  # noqa: BLE001
        return None
    return None if d.is_nan() else d


async def get_index_quote(name: str, yahoo_symbol: str) -> dict | None:
    """Returns {"name", "value", "change", "change_pct", "spark": [float, ...]}
    from the last ~8 trading days' closes, or None if the fetch failed."""
    try:
        history = await asyncio.to_thread(lambda: yf.Ticker(yahoo_symbol).history(period="1mo"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("index history(%s) failed: %s", yahoo_symbol, exc)
        return None

    closes = [float(c) for c in history["Close"].tolist() if not math.isnan(c)]
    if len(closes) < 2:
        return None

    latest = closes[-1]
    previous = closes[-2]
    change = latest - previous
    change_pct = (change / previous) * 100 if previous else 0.0

    return {
        "name": name,
        "value": _safe_decimal(latest),
        "change": _safe_decimal(change),
        "change_pct": _safe_decimal(change_pct),
        "spark": closes[-8:],
    }


async def get_all_index_quotes() -> list[dict]:
    results = await asyncio.gather(
        *(get_index_quote(name, symbol) for name, symbol in TRACKED_INDICES.items())
    )
    return [r for r in results if r is not None]
