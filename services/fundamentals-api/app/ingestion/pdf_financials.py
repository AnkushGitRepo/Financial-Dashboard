"""Annual-report PDF table extraction — Tier 1's last resort for financial
statement line items XBRL doesn't cover.

Uses `pdfplumber` (pure Python, no system dependencies) as the primary
extractor since it's the friendlier choice for a free, self-hostable
project: `camelot`'s lattice/stream modes need a system Ghostscript
install, which is an extra piece of friction for anyone self-hosting. If
`pdfplumber` finds no usable table on a page, `camelot` is tried as a
second attempt on that same page before giving up on it.

This is inherently heuristic: annual report layouts vary a lot between
companies, so "find the page whose text mentions the statement we want,
then extract whatever table pdfplumber/camelot finds on it" is a
best-effort strategy, not a guarantee. It logs which page and which
extractor served each statement so a wrong page can be spotted in logs.
"""

from __future__ import annotations

import logging
import re
import tempfile
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path

import httpx
import pdfplumber

from app.schemas import StatementType

logger = logging.getLogger("fundamentals.pdf_financials")

_STATEMENT_KEYWORDS: dict[StatementType, list[str]] = {
    StatementType.PROFIT_AND_LOSS: [
        "statement of profit and loss", "statement of profit & loss",
    ],
    StatementType.BALANCE_SHEET: ["balance sheet"],
    StatementType.CASH_FLOW: ["cash flow statement", "statement of cash flows"],
}

_NUMBER_RE = re.compile(r"^\(?-?[\d,]+\.?\d*\)?$")


async def download_pdf(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def _find_statement_pages(pdf: pdfplumber.PDF, statement_type: StatementType) -> list[int]:
    keywords = _STATEMENT_KEYWORDS[statement_type]
    matches = []
    for index, page in enumerate(pdf.pages):
        text = (page.extract_text() or "").lower()
        if any(keyword in text for keyword in keywords):
            matches.append(index)
    return matches


def _clean_number(raw: str) -> Decimal | None:
    raw = raw.strip()
    if not _NUMBER_RE.match(raw):
        return None
    negative = raw.startswith("(") and raw.endswith(")")
    cleaned = raw.strip("()").replace(",", "")
    try:
        value = Decimal(cleaned)
    except InvalidOperation:
        return None
    return -value if negative else value


def _rows_to_line_items(rows: list[list[str | None]]) -> list[dict]:
    """First non-empty cell in a row is treated as the label; the first
    numeric-looking cell after it is treated as the value for the most
    recent reporting period (annual report tables list the current year
    first, per Schedule III presentation requirements)."""
    line_items = []
    for row in rows:
        cells = [c.strip() if c else "" for c in row]
        if not cells or not cells[0]:
            continue
        label = cells[0]
        value = next((_clean_number(c) for c in cells[1:] if _clean_number(c) is not None), None)
        if value is not None:
            line_items.append({"label": label, "value": value})
    return line_items


def _try_camelot(pdf_path: str, page_index: int) -> list[dict]:
    """camelot needs a filesystem path (not bytes), and its lattice/stream
    modes need a system Ghostscript install — this is why it's the second
    attempt, not the primary path (see module docstring)."""
    try:
        import camelot
    except ImportError:
        return []

    try:
        tables = camelot.read_pdf(pdf_path, pages=str(page_index + 1), flavor="lattice")
    except Exception as exc:  # noqa: BLE001 — Ghostscript missing, malformed page, etc.
        logger.info("camelot failed on page %d: %s", page_index + 1, exc)
        return []

    for table in tables:
        items = _rows_to_line_items(table.df.values.tolist())
        if len(items) >= 3:
            return items
    return []


def extract_statement_from_pdf(
    pdf_bytes: bytes, statement_type: StatementType
) -> list[dict]:
    """Returns [{"label": str, "value": Decimal}, ...] for the first page
    that both mentions the statement and yields a parseable table. Returns
    [] if nothing usable was found — the caller falls through to Tier 2/3."""
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        pages = _find_statement_pages(pdf, statement_type)
        if not pages:
            logger.info("no page mentioning %s found in PDF", statement_type)
            return []

        for page_index in pages:
            page = pdf.pages[page_index]
            tables = page.extract_tables()
            for table in tables:
                items = _rows_to_line_items(table)
                if len(items) >= 3:  # a handful of rows = plausibly the real table, not noise
                    logger.info(
                        "extracted %s from PDF page %d via pdfplumber (%d line items)",
                        statement_type, page_index + 1, len(items),
                    )
                    return items

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    try:
        for page_index in pages:
            items = _try_camelot(tmp_path, page_index)
            if items:
                logger.info(
                    "extracted %s from PDF page %d via camelot (%d line items)",
                    statement_type, page_index + 1, len(items),
                )
                return items
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    logger.warning(
        "found a %s page but no parseable table via pdfplumber or camelot",
        statement_type,
    )
    return []
