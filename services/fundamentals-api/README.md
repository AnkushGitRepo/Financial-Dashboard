# MarketMitra Fundamentals API

The screener.in-style data service: ratios, historical financial statements
(P&L, balance sheet, cash flow), shareholding pattern, company documents,
and the price history behind them — for Indian-listed companies. Sourced
entirely from free, public data via a three-tier fallback chain (see
[ADR 0011](../../docs/decisions/0011-three-tier-fundamentals-data-sourcing.md)).
No paid vendor, no API key required to run this service.

Python + FastAPI, deliberately separate from the main Next.js app — see
ADR 0011 for why this needed an explicit, scoped exception to
[ADR 0004](../../docs/decisions/0004-nextjs-api-routes-as-backend.md).

## Stack

- FastAPI (async), served with uvicorn
- PostgreSQL via SQLAlchemy (async) + asyncpg, migrations via Alembic
- pydantic v2 for validation, polars available for heavier tabular work,
  httpx for concurrent requests, orjson for fast response serialization
- Ingestion: `nsepython` / `bsedata` (Tier 1), `yfinance` (Tier 2),
  `scrapling` against Screener.in (Tier 3, isolated —
  see `app/ingestion/tier3_screener_scrapling/README.md`)

## Setup

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

createdb marketmitra_fundamentals   # or point DATABASE_URL at any Postgres

cp .env.example .env                # defaults work against a local Postgres

alembic upgrade head
```

## Running

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8420
```

`GET /health`, then e.g. `GET /companies/RELIANCE` (includes `about`),
`/companies/RELIANCE/ratios`, `/companies/RELIANCE/financials/profit_and_loss`,
`/companies/RELIANCE/shareholding`, `/companies/RELIANCE/peers`,
`/companies/RELIANCE/prices`, `/companies/RELIANCE/documents` (annual
reports, BSE-hosted PDFs), `GET /indices` (real NIFTY 50/SENSEX/
NIFTY BANK/INDIA VIX quotes, live via yfinance — not company-keyed, not
cached), `GET /quote?symbols=A,B,C` (batched live quote — last price,
previous close, intraday % change, 52-week high/low — for N symbols at
once, see "Live quote" below), and `GET /search?q=` (search across all
~2,570 NSE-listed equities plus the tracked indices — see "Company
search" below). Every company response that can come from more than one
tier carries a `source_tier` field.

## Company search (`GET /search?q=`)

Backed by a `company_master` table (`app/ingestion/company_master.py`),
populated from NSE's own published equity list at
`archives.nseindia.com/content/equities/EQUITY_L.csv` — confirmed reachable
even though `www.nseindia.com` is blocked in this project's dev environment
(see the Tier 1 module's docstring). Same accepted unofficial-access
trade-off as the rest of Tier 1 (ADR 0011). Lazily populated on first
search call (a few thousand rows, fast); not part of the three-tier
per-company fallback chain since it's a lookup table, not company data.

## Live quote (`GET /quote?symbols=A,B,C`)

`app/ingestion/quotes.py` + `app/api/routes/quote.py`. The read path the
MarketMitra alerts engine polls (ADR 0014): a lightweight, DB-free "price
right now, for these N symbols" call so an alert-evaluation cycle fetches
every symbol it needs in one request. Backed by yfinance's `fast_info`
(Tier 2 — a single quote-summary fetch carrying last price, previous
close, and the 52-week range together); NSE/BSE are blocked from this
environment and Screener.in is fundamentals-only, so yfinance is the only
viable source here. Response per symbol: `{ symbol, price, prev_close,
change_pct, week52_high, week52_low, as_of, source_tier }`. A tracked
index name (e.g. `NIFTY 50`) also resolves. Symbols whose upstream fetch
fails are omitted from the response, never returned with a fabricated
price. Results are held in a short in-process TTL cache
(`quote_cache_ttl_seconds`, default 60) so the alert cron and any
dashboard caller share one upstream hit. Capped at 100 symbols/request.

## Testing

```bash
pytest
```

All 36 tests run offline — no network, no database. They use saved
fixtures (a real Screener.in page a maintainer saved to disk, a synthetic
but taxonomy-accurate XBRL instance document, a generated PDF with a ruled
table) rather than live calls, so they're deterministic and don't depend on
Screener.in/NSE/BSE/Yahoo staying reachable or unchanged.

## Current real coverage (stated plainly, not aspirationally)

| Data | Primary | Fallback | Status |
|---|---|---|---|
| Quote / company info | Tier 1 (BSE via `bsedata`; NSE via `nsepython`) | Tier 2 (`yfinance`) | Both wired and tested. NSE itself is frequently blocked at Akamai's edge (see `app/ingestion/tier1_nse_bse.py`) — this is exactly why Tier 2 exists. |
| Price history | Tier 2 (`yfinance`) | — | Wired and tested. |
| Live quote (`GET /quote`) | Tier 2 (`yfinance` `fast_info`) | — | Batched, DB-free, 60s in-process cache. Last price / prev close / intraday % / 52-week range. Feeds MarketMitra's alerts engine (ADR 0014). Verified live for RELIANCE, TCS, NIFTY 50; a bad symbol is dropped, not faked. |
| Ratios | Tier 3 (Screener.in) | — | Tiers 1/2 don't expose comparable named/computed ratios as raw data. |
| Shareholding pattern | Tier 1 (direct NSE endpoint) | Tier 3 (Screener.in) | Tier 1's response shape is unverified (NSE blocked during development); Tier 3 is verified against two real companies and captures full quarterly history (typically 12 quarters), not just the latest. |
| Financial statements (P&L/BS/CF) | Tier 3 (Screener.in) | — | Tier 1's XBRL parser and PDF table extractor are both implemented and unit-tested against fixtures, but wiring them into the live service needs a filing-URL discovery step (find the latest quarterly XBRL / annual report PDF for a company) that hasn't been built yet. |
| About (business description) | Tier 3 (Screener.in) | — | Backfilled once per company and cached indefinitely (not TTL-refreshed) — the text rarely changes. |
| Peer comparison | Tier 3 (Screener.in) | — | Screener lazy-loads this table via AJAX far more often than server-rendering it inline (confirmed for large caps and mid-caps alike). Reads Screener's own JS to find the real endpoint (`/api/company/{warehouse_id}/peers/`, keyed by a different internal id than the one shown in the page's own HTML attributes at first glance) rather than guessing — verified working for Reliance, TCS, and Newgen. |
| Documents (annual reports) | Tier 3 (Screener.in) | — | Screener's Documents section links directly to BSE-hosted PDFs, so this didn't need the Tier 1 filing-discovery step below — only annual reports are populated; other document types (XBRL filings, credit ratings, etc.) still need it. |

See `app/services/fundamentals_service.py`'s module docstring for the same
detail in code, and ROADMAP.md's Phase 4 checklist for what's tracked as
still open.
