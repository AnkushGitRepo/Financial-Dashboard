#!/usr/bin/env python3
"""Out-of-band IPO refresh (ADR 0017).

The InvestorGain "Live IPO GMP" report is a client-rendered SPA, so a plain
HTTP GET can't see the table and the serverless `fundamentals-api` function
can't bundle a headless browser (ADR 0013). This script — meant to run from
CI (see `.github/workflows/refresh-ipos.yml`) — renders the page with
Playwright Chromium, parses it with the same `_parse_ipo_rows` the tests
use, and POSTs the rows to `POST /ipos/ingest`.

Env:
  FUNDAMENTALS_API_URL   base URL of the deployed service (required unless --dry-run)
  IPO_INGEST_TOKEN       shared secret for /ipos/ingest (required unless --dry-run)

Usage:
  python scripts/refresh_ipos.py            # render, parse, POST
  python scripts/refresh_ipos.py --dry-run  # render + parse + print, no POST
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ingestion.tier3_ipo_scraper.scraper import REPORT_URL, _parse_ipo_rows


def render_html(url: str) -> str:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page.goto(url, wait_until="networkidle", timeout=60_000)
        page.wait_for_selector("td[data-label='Name']", timeout=30_000)
        html = page.content()
        browser.close()
        return html


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="parse + print, don't POST")
    args = parser.parse_args()

    print(f"rendering {REPORT_URL} …", flush=True)
    html = render_html(REPORT_URL)
    rows = _parse_ipo_rows(html)
    print(f"parsed {len(rows)} IPO rows", flush=True)
    if not rows:
        print("no rows — aborting (nothing to ingest)", file=sys.stderr)
        return 1

    payload = {"rows": json.loads(json.dumps(rows, default=str))}

    if args.dry_run:
        for r in rows:
            print(f"  {r['name'][:30]:30} {r['status']:9} GMP={r['gmp']}")
        return 0

    base = os.environ["FUNDAMENTALS_API_URL"].rstrip("/")
    token = os.environ["IPO_INGEST_TOKEN"]
    resp = httpx.post(
        f"{base}/ipos/ingest",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    resp.raise_for_status()
    print(f"ingest ok: {resp.json()}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
