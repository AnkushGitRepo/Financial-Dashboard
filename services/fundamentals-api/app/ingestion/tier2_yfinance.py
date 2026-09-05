"""Tier 2: yfinance — fallback for live/historical price data and any
general market-data gaps Tier 1 didn't cover. Verified working live from
this project's dev environment (see tier1_nse_bse.py's docstring for the
contrast with NSE, which was blocked from the same environment).

Only ever called for fields Tier 1 didn't produce — see
app/ingestion/orchestrator.py, which drives that per-field fallback logic.
yfinance itself is a synchronous library with no async API, so calls are
pushed to a thread via asyncio.to_thread rather than blocking the event
loop.
"""

from __future__ import annotations

import asyncio
import logging
from decimal import Decimal

import yfinance as yf

logger = logging.getLogger("fundamentals.tier2")


def _yahoo_symbol(nse_symbol: str | None, bse_code: str | None) -> str | None:
    if nse_symbol:
        return f"{nse_symbol}.NS"
    if bse_code:
        return f"{bse_code}.BO"
    return None


async def get_price_history(
    nse_symbol: str | None, bse_code: str | None, period: str = "1y"
) -> list[dict]:
    """Returns [{"trade_date": date, "open": Decimal, "high": ..., "low": ...,
    "close": ..., "volume": int}, ...] or [] if no Yahoo symbol could be
    resolved or the fetch failed."""
    symbol = _yahoo_symbol(nse_symbol, bse_code)
    if symbol is None:
        return []

    try:
        history = await asyncio.to_thread(
            lambda: yf.Ticker(symbol).history(period=period)
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("yfinance history(%s) failed: %s", symbol, exc)
        return []

    if history.empty:
        return []

    points = []
    for trade_date, row in history.iterrows():
        points.append(
            {
                "trade_date": trade_date.date() if hasattr(trade_date, "date") else trade_date,
                "open": _safe_decimal(row.get("Open")),
                "high": _safe_decimal(row.get("High")),
                "low": _safe_decimal(row.get("Low")),
                "close": _safe_decimal(row.get("Close")),
                "volume": int(row["Volume"]) if row.get("Volume") == row.get("Volume") else None,
            }
        )
    return points


async def get_quote_gap_fill(nse_symbol: str | None, bse_code: str | None) -> dict:
    """General quote-field gap-fill (name/industry/last price) for whatever
    Tier 1 didn't return."""
    symbol = _yahoo_symbol(nse_symbol, bse_code)
    if symbol is None:
        return {}

    try:
        ticker = yf.Ticker(symbol)
        fast_info = await asyncio.to_thread(lambda: dict(ticker.fast_info))
    except Exception as exc:  # noqa: BLE001
        logger.warning("yfinance fast_info(%s) failed: %s", symbol, exc)
        fast_info = {}

    try:
        # .info is a much heavier call than fast_info (fetches the full quote
        # summary) — only worth it here because this whole function only runs
        # as a fallback, not on the hot path.
        info = await asyncio.to_thread(lambda: dict(ticker.info))
    except Exception as exc:  # noqa: BLE001
        logger.warning("yfinance info(%s) failed: %s", symbol, exc)
        info = {}

    return {
        "name": info.get("longName") or info.get("shortName"),
        "industry": info.get("industry"),
        "sector": info.get("sector"),
        "last_price": _safe_decimal(fast_info.get("lastPrice")),
        "day_high": _safe_decimal(fast_info.get("dayHigh")),
        "day_low": _safe_decimal(fast_info.get("dayLow")),
    }


def _safe_decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        decimal_value = Decimal(str(value))
    except Exception:  # noqa: BLE001
        return None
    return None if decimal_value.is_nan() else decimal_value
