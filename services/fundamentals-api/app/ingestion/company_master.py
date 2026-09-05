"""The full NSE-listed-equity symbol/name list, for search — not the
per-company fallback chain (ADR 0011), just a lookup table so the Markets
page can search "all the stocks the Indian market has," not just whatever
companies have already been queried once.

Source: NSE's own published equity list at `archives.nseindia.com`. Unlike
`www.nseindia.com` (blocked by Akamai in this project's dev environment —
see tier1_nse_bse.py), the `archives.` subdomain was confirmed reachable
during development. This is still NSE's own unofficial-access surface, not
a documented public API — same accepted trade-off as the rest of Tier 1
(ADR 0011).
"""

from __future__ import annotations

import csv
import io
import logging

import httpx

logger = logging.getLogger("fundamentals.company_master")

EQUITY_LIST_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"


async def fetch_equity_list() -> list[dict]:
    """Returns [{"symbol": str, "name": str}, ...] for every NSE-listed
    equity, or [] if the fetch failed (network issue, NSE blocking this
    environment, format change)."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(EQUITY_LIST_URL)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("failed to fetch NSE equity list: %s", exc)
        return []

    reader = csv.DictReader(io.StringIO(response.text))
    companies = []
    for row in reader:
        symbol = (row.get("SYMBOL") or "").strip()
        name = (row.get("NAME OF COMPANY") or "").strip()
        if symbol and name:
            companies.append({"symbol": symbol, "name": name})

    if not companies:
        logger.warning("NSE equity list parsed to zero rows — format may have changed")
    return companies
