# Tier 3 — Screener.in (Scrapling)

This is the last-resort tier in the fallback chain: only invoked for fields
Tier 1 (NSE/BSE) and Tier 2 (yfinance) didn't cover — mainly derived ratios
Screener.in computes that aren't available as a raw published number
anywhere else for free.

## Why this is isolated

Screener.in's HTML structure can change without notice; this is a
community/personal project's website, not a documented, versioned API, and
scraping it sits in a legal/ToS gray area more than Tiers 1–2 do (see
[ADR 0011](../../../../docs/decisions/0011-three-tier-fundamentals-data-sourcing.md)).
Keeping it in its own module — with its own entry point, its own test
fixtures, its own selectors — means:

- It can be disabled entirely (set `tier3_enabled = False` in
  `app/config.py`, or simply don't register `screener_resolver` in the
  orchestrator's resolver list) without touching Tier 1/2 code.
- If Screener.in changes its markup, only this directory's selectors need
  updating — the rest of the ingestion pipeline is unaffected.
- It can be swapped for a different tertiary source later by replacing this
  directory's contents behind the same `fetch_ratios(symbol)` /
  `fetch_financial_statement(symbol, statement_type)` entry points.

## What was actually verified

The selectors in `scraper.py` were checked against two independent real
pages: a live fetch of `https://www.screener.in/company/RELIANCE/consolidated/`
during development, and a second real page — Newgen Software's
consolidated page, saved from a browser by the project maintainer at
`tests/fixtures/screener_newgen_consolidated.html` — used as a permanent,
network-free regression test in `tests/test_tier3_scraper.py`. Agreeing
across two unrelated companies (different sectors, different shareholding
category sets — Newgen has no "Government" row, Reliance does) is real
evidence the selectors target Screener's shared template rather than
something specific to one company's page:

- `#top-ratios li` → each `li` has a `.name` (label) and a nested
  `.number` (the numeric value) — confirmed via the page's real HTML.
- `#profit-loss table`, `#balance-sheet table`, `#cash-flow table`,
  `#shareholding table` follow the same shape: a header row of period
  labels (`Mar 2024`, `Mar 2025`, ..., `TTM`), then one row per line item
  with the label in the first cell (often trailing `\xa0+` for an
  expandable row) and one value per period column.

## Resilience

- Retries with backoff on transient failures (`scraper.py`'s
  `_fetch_with_retry`).
- Every failure is logged with the symbol and the underlying error — this
  tier is the most likely to break silently, so silent failure here is
  treated as a bug in itself.
- Uses Scrapling's static `Fetcher` (no real browser) since Screener.in is
  server-rendered; if it ever starts requiring JS rendering, Scrapling's
  `StealthyFetcher` is the documented next step, at the cost of needing
  Playwright browser binaries installed.
