"""Tier 3 entry point: Screener.in via Scrapling. See README.md in this
directory for why this is isolated and what's actually been verified.

Public entry points (the only things the rest of the ingestion pipeline
should import from this module):

- fetch_ratios(symbol)
- fetch_financial_statement(symbol, statement_type)
- fetch_shareholding(symbol)

Parsing is split from fetching (`_parse_*` vs `fetch_*`) specifically so
tests can run the real parsing logic against a saved-to-disk Screener.in
page (`tests/fixtures/screener_newgen_consolidated.html`, a real page the
project maintainer saved from a browser) without any network call — see
`tests/test_tier3_scraper.py`.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from scrapling.fetchers import Fetcher

from app.schemas import PeriodType, StatementType

logger = logging.getLogger("fundamentals.tier3_screener")

_BASE_URL = "https://www.screener.in/company/{symbol}/consolidated/"
_MAX_RETRIES = 3
_RETRY_BACKOFF_SECONDS = 2.0

_STATEMENT_SECTION_IDS = {
    StatementType.PROFIT_AND_LOSS: "profit-loss",
    StatementType.BALANCE_SHEET: "balance-sheet",
    StatementType.CASH_FLOW: "cash-flow",
}

_MONTH_ABBR = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
_PERIOD_LABEL_RE = re.compile(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$")


async def _fetch_with_retry(symbol: str):
    url = _BASE_URL.format(symbol=symbol)
    last_error: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            response = await asyncio.to_thread(Fetcher.get, url, timeout=15)
            if response.status == 200:
                return response
            last_error = RuntimeError(f"HTTP {response.status}")
        except Exception as exc:  # noqa: BLE001
            last_error = exc

        logger.warning(
            "screener.in fetch for %s failed (attempt %d/%d): %s",
            symbol, attempt, _MAX_RETRIES, last_error,
        )
        if attempt < _MAX_RETRIES:
            await asyncio.sleep(_RETRY_BACKOFF_SECONDS * attempt)

    logger.error("screener.in fetch for %s failed after %d attempts: %s", symbol, _MAX_RETRIES, last_error)
    return None


def _parse_number(raw: str | None) -> Decimal | None:
    if raw is None:
        return None
    cleaned = raw.strip().replace(",", "").rstrip("%").strip()
    if not cleaned or cleaned in ("-", "N/A"):
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _period_end_for_label(label: str) -> tuple[PeriodType, date | None]:
    label = label.strip()
    if label.upper() == "TTM":
        return PeriodType.TTM, None
    match = _PERIOD_LABEL_RE.match(label)
    if not match:
        return PeriodType.ANNUAL, None
    month, year = _MONTH_ABBR[match.group(1)], int(match.group(2))
    # last day of that month, without pulling in a calendar dependency
    if month == 12:
        next_month_first = date(year + 1, 1, 1)
    else:
        next_month_first = date(year, month + 1, 1)
    period_end = date(next_month_first.year, next_month_first.month, 1) - timedelta(days=1)
    return PeriodType.ANNUAL, period_end


def _parse_ratios(page) -> list[dict]:
    """Returns [{"name": str, "value": Decimal, "unit": str | None}, ...]
    scraped from the top-ratios box (#top-ratios li .name / .number)."""
    ratios: list[dict] = []
    for li in page.css("#top-ratios li"):
        name_nodes = li.css(".name")
        name = name_nodes[0].get_all_text().strip() if name_nodes else ""
        number_text = li.css(".number::text").get()
        value = _parse_number(number_text)
        if not name or value is None:
            continue
        unit = None
        text_blob = li.get_all_text()
        if "%" in text_blob:
            unit = "%"
        elif "₹" in text_blob:
            unit = "INR"
        ratios.append({"name": name, "value": value, "unit": unit})
    return ratios


def _parse_financial_statement(page, statement_type: StatementType) -> list[dict]:
    """Returns [{"label": str, "period_type": PeriodType, "period_end": date | None,
    "value": Decimal}, ...] for the given statement's table."""
    section_id = _STATEMENT_SECTION_IDS[statement_type]
    sections = page.css(f"#{section_id}")
    if not sections:
        return []
    tables = sections[0].css("table")
    if not tables:
        return []

    rows = tables[0].css("tr")
    if len(rows) < 2:
        return []

    period_labels = [cell.get_all_text().strip() for cell in rows[0].css("th")][1:]
    periods = [_period_end_for_label(label) for label in period_labels]

    line_items: list[dict] = []
    for row in rows[1:]:
        cells = row.css("td")
        if not cells:
            continue
        label = cells[0].get_all_text().replace("\xa0", " ").strip().rstrip("+").strip()
        for (period_type, period_end), cell in zip(periods, cells[1:], strict=False):
            value = _parse_number(cell.get_all_text().strip())
            if value is None:
                continue
            line_items.append(
                {
                    "label": label,
                    "period_type": period_type,
                    "period_end": period_end,
                    "value": value,
                }
            )
    return line_items


def _parse_shareholding(page) -> list[dict]:
    """Returns [{"category": str, "quarter_end": date | None, "percentage": Decimal}, ...]
    — one entry per (category, quarter) so callers can chart the full
    history Screener shows (five quarters), not just the latest one."""
    sections = page.css("#shareholding")
    if not sections:
        return []
    tables = sections[0].css("table")
    if not tables:
        return []

    rows = tables[0].css("tr")
    if len(rows) < 2:
        return []

    period_labels = [cell.get_all_text().strip() for cell in rows[0].css("th")][1:]
    periods = [_period_end_for_label(label)[1] for label in period_labels]

    entries: list[dict] = []
    for row in rows[1:]:
        cells = row.css("td")
        if not cells:
            continue
        category = cells[0].get_all_text().replace("\xa0", " ").strip().rstrip("+").strip()
        if category.lower() == "no. of shareholders":
            continue  # a shareholder count, not an ownership category — not a ShareholdingEntry
        for period_end, cell in zip(periods, cells[1:], strict=False):
            if period_end is None:
                continue
            value = _parse_number(cell.get_all_text().strip())
            if value is not None:
                entries.append(
                    {"category": category, "quarter_end": period_end, "percentage": value}
                )
    return entries


async def fetch_ratios(symbol: str) -> list[dict]:
    page = await _fetch_with_retry(symbol)
    if page is None:
        return []
    ratios = _parse_ratios(page)
    if not ratios:
        logger.warning("screener.in ratios for %s parsed to zero entries — markup may have changed", symbol)
    return ratios


async def fetch_financial_statement(symbol: str, statement_type: StatementType) -> list[dict]:
    page = await _fetch_with_retry(symbol)
    if page is None:
        return []
    line_items = _parse_financial_statement(page, statement_type)
    if not line_items:
        logger.warning(
            "screener.in %s table for %s parsed to zero line items — markup may have changed",
            statement_type, symbol,
        )
    return line_items


async def fetch_shareholding(symbol: str) -> list[dict]:
    page = await _fetch_with_retry(symbol)
    if page is None:
        return []
    entries = _parse_shareholding(page)
    if not entries:
        logger.warning(
            "screener.in shareholding for %s parsed to zero entries — markup may have changed", symbol
        )
    return entries
