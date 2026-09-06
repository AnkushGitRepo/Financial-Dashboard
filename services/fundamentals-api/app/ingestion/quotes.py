"""Batched live quotes — the read path the alerts engine polls (see ADR 0014).

Distinct from `app/api/routes/prices.py` (end-of-day OHLC history, persisted
to Postgres) and from the per-company three-tier fallback chain: this is a
lightweight "what's the price *right now*, for these N symbols" call with no
database involvement at all, so an alert-evaluation cycle can fetch every
symbol it cares about in one request.

yfinance (Tier 2) is the only one of the three sources that serves this
cheaply — `fast_info` is a single quote-summary fetch carrying last price,
previous close, and the 52-week range together. NSE/BSE's own endpoints are
blocked from this environment (ADR 0011) and Screener.in is
fundamentals-only. Results are held in a short in-process TTL cache so the
10-minute alert cron and any dashboard caller share one upstream hit.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import UTC, datetime
from decimal import Decimal

import yfinance as yf

from app.config import get_settings
from app.ingestion.indices import TRACKED_INDICES

logger = logging.getLogger("fundamentals.quotes")

_SOURCE_TIER = "tier2_yfinance"

# resolved-yahoo-symbol -> (fetched_at_monotonic, quote dict)
_CACHE: dict[str, tuple[float, dict]] = {}

_MAX_SYMBOLS = 100


def _yahoo_symbol(symbol: str) -> str:
    """A tracked index name maps to its Yahoo `^` ticker; anything else is
    treated as an NSE equity symbol."""
    key = symbol.strip().upper()
    if key in TRACKED_INDICES:
        return TRACKED_INDICES[key]
    return f"{key}.NS"


def _safe_decimal(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        d = Decimal(str(value))
    except Exception:  # noqa: BLE001
        return None
    return None if d.is_nan() else d


def _raw_fast_info(yahoo_symbol: str) -> dict:
    """The one real yfinance call. Factored out so tests can replace it
    without touching the network."""
    return dict(yf.Ticker(yahoo_symbol).fast_info)


def _build_quote(symbol: str, fast_info: dict) -> dict | None:
    price = _safe_decimal(fast_info.get("lastPrice"))
    if price is None:
        return None
    prev_close = _safe_decimal(fast_info.get("previousClose"))
    change_pct: Decimal | None = None
    if prev_close is not None and prev_close != 0:
        # Decimal division is otherwise unbounded — 4 dp is plenty for a %.
        change_pct = ((price - prev_close) / prev_close * Decimal(100)).quantize(Decimal("0.0001"))
    return {
        "symbol": symbol.strip().upper(),
        "price": price,
        "prev_close": prev_close,
        "change_pct": change_pct,
        "week52_high": _safe_decimal(fast_info.get("yearHigh")),
        "week52_low": _safe_decimal(fast_info.get("yearLow")),
        "as_of": datetime.now(tz=UTC).isoformat(),
        "source_tier": _SOURCE_TIER,
    }


async def get_quote(symbol: str) -> dict | None:
    """One symbol. Returns None (never a fabricated price) when the upstream
    fetch fails or carries no last price — callers must skip it."""
    yahoo_symbol = _yahoo_symbol(symbol)
    ttl = get_settings().quote_cache_ttl_seconds

    cached = _CACHE.get(yahoo_symbol)
    if cached is not None and (time.monotonic() - cached[0]) < ttl:
        # Re-stamp the cached payload with the caller's spelling of the symbol.
        return {**cached[1], "symbol": symbol.strip().upper()}

    try:
        fast_info = await asyncio.to_thread(_raw_fast_info, yahoo_symbol)
    except Exception as exc:  # noqa: BLE001
        logger.warning("quote fast_info(%s) failed: %s", yahoo_symbol, exc)
        return None

    quote = _build_quote(symbol, fast_info)
    if quote is not None:
        _CACHE[yahoo_symbol] = (time.monotonic(), quote)
    return quote


async def get_quotes(symbols: list[str]) -> list[dict]:
    """Deduplicated, order-preserving, capped at _MAX_SYMBOLS. Symbols whose
    fetch failed are omitted from the result, not returned as nulls."""
    seen: set[str] = set()
    ordered: list[str] = []
    for raw in symbols:
        key = raw.strip().upper()
        if key and key not in seen:
            seen.add(key)
            ordered.append(key)
    ordered = ordered[:_MAX_SYMBOLS]

    results = await asyncio.gather(*(get_quote(s) for s in ordered))
    return [r for r in results if r is not None]


def _clear_cache() -> None:
    """Test hook."""
    _CACHE.clear()
