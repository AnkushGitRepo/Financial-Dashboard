"""Tier 1 filing-URL discovery — the missing link between the XBRL/PDF
extractors (`xbrl_parser.py`, `pdf_financials.py`) and a real filing.

Given an NSE symbol (and optionally a BSE code), find the most recent
**financial-results filing** and return where its XBRL and/or PDF live,
plus the period it covers. `fundamentals_service.get_financial_statement`
then downloads and parses it before falling back to the Tier 3 (Screener)
scrape.

**Honest scope, stated the way the rest of Tier 1 is:**

- **NSE path** (`/api/corporates-financial-results`) is the primary. It
  needs the same cookie handshake as `get_shareholding_pattern`, and NSE
  blocks this project's dev/CI environment at the Akamai edge (ADR 0011) —
  so the *network* function is unverified end-to-end here. The *parser* is
  tested against a fixture built to the documented response shape; loud
  logging fires if a live response doesn't match, and an unusable response
  returns `None` so the fallback chain moves on cleanly.
- **BSE path** (`api.bseindia.com` announcements) is the fallback and is
  PDF-only — BSE's results XBRL lives behind a different, fiddlier path
  that isn't worth chasing for a best-effort feature. A BSE filing is only
  used when a period-end date can be parsed out of the announcement subject;
  otherwise it's skipped.
- If neither path produces a usable filing, `get_financial_statement` is
  unchanged — Tier 3 still serves.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date, datetime

import httpx

from app.config import get_settings
from app.ingestion import xbrl_parser
from app.ingestion.rate_limit import RateLimiter
from app.schemas import PeriodType, StatementType

# NOTE: `app.ingestion.pdf_financials` is imported lazily inside
# `extract_tier1_line_items` — it pulls in `pdfplumber`, which the trimmed
# production `requirements.txt` deliberately omits (ADR 0013). Keeping it off
# this module's import chain means `filing_discovery` (which IS on the live
# request path) stays lean; the PDF branch just degrades to "no items" and
# the caller falls through to Tier 3.

logger = logging.getLogger("fundamentals.filing_discovery")

_settings = get_settings()
_nse_limiter = RateLimiter(_settings.nse_requests_per_second)

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

_BSE_ATTACH_BASE = "https://www.bseindia.com/xml-data/corpfiling/AttachLive/"


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=_BROWSER_HEADERS) as c:
        resp = await c.get(url)
        resp.raise_for_status()
        return resp.content


@dataclass(frozen=True)
class FilingRef:
    exchange: str  # "NSE" | "BSE"
    period_end: date
    period_type: PeriodType
    is_consolidated: bool
    xbrl_url: str | None
    pdf_url: str | None
    filed_at: date | None


# --- date helpers -----------------------------------------------------------

_DATE_FORMATS = ("%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d", "%d %b %Y", "%d-%B-%Y")


def _parse_date_loose(value: object) -> date | None:
    if not value:
        return None
    text = str(value).strip().split("T", 1)[0]
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()  # noqa: DTZ007 — date-only
        except ValueError:
            continue
    return None


# "... ended June 30, 2026" / "... ended 31st March, 2026" — month-first and
# day-first are both used in Indian filing subject lines.
_PERIOD_IN_TEXT = re.compile(
    r"(?:quarter|half[\s-]?year|year|period)\s+ended\s+([A-Za-z0-9 ,./-]{6,32})",
    re.IGNORECASE,
)
_TEXT_DATE_FORMATS = ("%B %d %Y", "%d %B %Y", "%b %d %Y", "%d %b %Y")


def _period_end_from_text(text: str | None) -> date | None:
    if not text:
        return None
    m = _PERIOD_IN_TEXT.search(text)
    if not m:
        return None
    chunk = re.sub(r"(?<=\d)(st|nd|rd|th)", "", m.group(1), flags=re.IGNORECASE)
    chunk = re.sub(r"[.,/-]+", " ", chunk)
    tokens = re.sub(r"\s+", " ", chunk).strip().split(" ")
    if len(tokens) < 3:
        return None
    candidate = " ".join(tokens[:3])
    for fmt in _TEXT_DATE_FORMATS:
        try:
            return datetime.strptime(candidate, fmt).date()  # noqa: DTZ007 — date-only
        except ValueError:
            continue
    return None


def _period_type_for(period_end: date, relating_to: str | None) -> PeriodType:
    text = (relating_to or "").lower()
    if "annual" in text or "year" in text:
        return PeriodType.ANNUAL
    if "quarter" in text or "half" in text:
        return PeriodType.QUARTERLY
    # Fall back on the month: March-end filings are usually the annual one.
    return PeriodType.ANNUAL if period_end.month == 3 else PeriodType.QUARTERLY


# --- pure parsers ---------------------------------------------------------


def parse_nse_financial_results(payload: object) -> list[FilingRef]:
    """From NSE's `/api/corporates-financial-results` response (a list of
    filing dicts, or `{"data": [...]}`). Best-effort field mapping — see
    module docstring."""
    records = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(records, list):
        logger.warning("NSE financial-results response had an unrecognized shape: %r", type(payload))
        return []

    refs: list[FilingRef] = []
    for rec in records:
        if not isinstance(rec, dict):
            continue
        period_end = _parse_date_loose(rec.get("toDate") or rec.get("to_date") or rec.get("toDt"))
        if period_end is None:
            continue
        xbrl_url = _clean_url(rec.get("xbrl") or rec.get("xbrlFile") or rec.get("xbrl_url"))
        pdf_url = _clean_url(
            rec.get("attachmentFile")
            or rec.get("fileName")
            or rec.get("attchmntFile")
            or rec.get("naVal")
        )
        if not xbrl_url and not pdf_url:
            continue
        relating = rec.get("relatingTo") or rec.get("relating_to") or rec.get("period")
        consolidated = "consol" in str(rec.get("consolidated") or rec.get("consFlag") or "").lower()
        refs.append(
            FilingRef(
                exchange="NSE",
                period_end=period_end,
                period_type=_period_type_for(period_end, relating),
                is_consolidated=consolidated,
                xbrl_url=xbrl_url,
                pdf_url=pdf_url,
                filed_at=_parse_date_loose(
                    rec.get("filingDate") or rec.get("filing_date") or rec.get("broadcastDate")
                ),
            )
        )

    if records and not refs:
        logger.warning(
            "NSE financial-results for a symbol parsed to zero usable filings out of %d "
            "records — field mapping likely needs updating against a live response.",
            len(records),
        )
    return refs


def parse_bse_annget_data(payload: object) -> list[FilingRef]:
    """From BSE's `AnnGetData` response (`{"Table": [...]}`). Results
    announcements only, PDF attachment only, and only when a period-end
    date is parseable from the subject/headline."""
    rows = payload.get("Table") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        return []

    refs: list[FilingRef] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        category = str(row.get("CATEGORYNAME") or row.get("Category") or "").lower()
        if "result" not in category:
            continue
        attachment = row.get("ATTACHMENTNAME") or row.get("AttachmentName")
        if not attachment or not str(attachment).lower().endswith((".pdf", ".xml")):
            continue
        subject = row.get("NEWSSUB") or row.get("HEADLINE") or row.get("News_submission")
        period_end = _period_end_from_text(subject if isinstance(subject, str) else None)
        if period_end is None:
            continue
        url = _BSE_ATTACH_BASE + str(attachment).lstrip("/")
        is_xml = str(attachment).lower().endswith(".xml")
        refs.append(
            FilingRef(
                exchange="BSE",
                period_end=period_end,
                period_type=_period_type_for(period_end, subject if isinstance(subject, str) else None),
                is_consolidated="consolidated" in str(subject).lower(),
                xbrl_url=url if is_xml else None,
                pdf_url=None if is_xml else url,
                filed_at=_parse_date_loose(row.get("NEWS_DT") or row.get("DT_TM")),
            )
        )
    return refs


def _clean_url(value: object) -> str | None:
    text = str(value).strip() if value else ""
    return text if text.startswith("http") else None


def pick_latest(refs: list[FilingRef]) -> FilingRef | None:
    """Newest period wins; ties broken toward a consolidated filing, then
    toward one that has an XBRL URL (structured data beats PDF scraping)."""
    if not refs:
        return None
    return max(
        refs,
        key=lambda r: (r.period_end, r.is_consolidated, r.xbrl_url is not None),
    )


# --- network (best-effort) ----------------------------------------------


async def _fetch_nse_financial_results(symbol: str) -> object:
    await _nse_limiter.wait()
    async with httpx.AsyncClient(headers=_BROWSER_HEADERS, timeout=12.0) as client:
        await client.get("https://www.nseindia.com")
        await client.get(
            "https://www.nseindia.com/companies-listing/corporate-filings-financial-results"
        )
        resp = await client.get(
            "https://www.nseindia.com/api/corporates-financial-results",
            params={"index": "equities", "symbol": symbol, "period": "Quarterly"},
        )
        resp.raise_for_status()
        return resp.json()


async def _fetch_bse_announcements(bse_code: str) -> object:
    async with httpx.AsyncClient(headers=_BROWSER_HEADERS, timeout=12.0) as client:
        resp = await client.get(
            "https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w",
            params={
                "strCat": "Result",
                "strPrevDate": "",
                "strScrip": bse_code,
                "strSearch": "P",
                "strToDate": "",
                "strType": "C",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def discover_latest_financial_filing(
    nse_symbol: str | None, bse_code: str | None = None
) -> FilingRef | None:
    """Try NSE, then BSE. Returns the single most-recent usable filing, or
    `None` — every failure mode (blocked, timeout, unrecognized shape,
    nothing to report) collapses to `None`."""
    if not _settings.financials_tier1_enabled:
        return None

    refs: list[FilingRef] = []

    if nse_symbol:
        try:
            refs = parse_nse_financial_results(await _fetch_nse_financial_results(nse_symbol))
        except (httpx.HTTPError, ValueError) as exc:
            logger.info("NSE financial-results fetch for %s failed: %s", nse_symbol, exc)

    if not refs and bse_code:
        try:
            refs = parse_bse_annget_data(await _fetch_bse_announcements(bse_code))
        except (httpx.HTTPError, ValueError) as exc:
            logger.info("BSE announcements fetch for %s failed: %s", bse_code, exc)

    latest = pick_latest(refs)
    if latest:
        logger.info(
            "discovered %s filing: period_end=%s xbrl=%s pdf=%s",
            latest.exchange, latest.period_end, bool(latest.xbrl_url), bool(latest.pdf_url),
        )
    return latest


# --- filing -> line items ---------------------------------------------------


async def extract_tier1_line_items(
    filing: FilingRef, statement_type: StatementType
) -> list[dict]:
    """Download the discovered filing and parse it into
    `[{label, value, period_end, period_type}]` for `statement_type`.
    XBRL first (structured), PDF as the fallback. Returns `[]` on any
    failure so the caller falls through to Tier 3."""
    raw_items: list[dict] = []

    if filing.xbrl_url:
        try:
            xml_bytes = await _download(filing.xbrl_url)
            facts = xbrl_parser.extract_facts(xml_bytes)
            mapped, _raw = xbrl_parser.map_facts_to_line_items(facts)
            raw_items = [
                {"label": it["label"], "value": it["value"]}
                for it in mapped
                if it["statement_type"] == statement_type
            ]
        except Exception as exc:  # noqa: BLE001 — download/parse is best-effort
            logger.info("XBRL parse for %s failed: %s", filing.xbrl_url, exc)

    if not raw_items and filing.pdf_url:
        try:
            from app.ingestion import pdf_financials  # lazy — see module note

            pdf_bytes = await _download(filing.pdf_url)
            raw_items = pdf_financials.extract_statement_from_pdf(pdf_bytes, statement_type)
        except Exception as exc:  # noqa: BLE001 — incl. ModuleNotFoundError for pdfplumber
            logger.info("PDF parse for %s skipped/failed: %s", filing.pdf_url, exc)

    return [
        {
            "label": it["label"],
            "value": it["value"],
            "period_end": filing.period_end,
            "period_type": filing.period_type,
        }
        for it in raw_items
    ]
