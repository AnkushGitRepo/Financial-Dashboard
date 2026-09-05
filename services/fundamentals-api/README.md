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

`GET /health`, then e.g. `GET /companies/RELIANCE`,
`/companies/RELIANCE/ratios`, `/companies/RELIANCE/financials/profit_and_loss`,
`/companies/RELIANCE/shareholding`, `/companies/RELIANCE/prices`,
`/companies/RELIANCE/documents`, `GET /indices` (real NIFTY 50/SENSEX/
NIFTY BANK/INDIA VIX quotes, live via yfinance — not company-keyed, not
cached), and `GET /search?q=` (search across all ~2,570 NSE-listed
equities plus the tracked indices — see "Company search" below). Every
company response that can come from more than one tier carries a
`source_tier` field.

## Company search (`GET /search?q=`)

Backed by a `company_master` table (`app/ingestion/company_master.py`),
populated from NSE's own published equity list at
`archives.nseindia.com/content/equities/EQUITY_L.csv` — confirmed reachable
even though `www.nseindia.com` is blocked in this project's dev environment
(see the Tier 1 module's docstring). Same accepted unofficial-access
trade-off as the rest of Tier 1 (ADR 0011). Lazily populated on first
search call (a few thousand rows, fast); not part of the three-tier
per-company fallback chain since it's a lookup table, not company data.

## Testing

```bash
pytest
```

All 25 tests run offline — no network, no database. They use saved
fixtures (a real Screener.in page a maintainer saved to disk, a synthetic
but taxonomy-accurate XBRL instance document, a generated PDF with a ruled
table) rather than live calls, so they're deterministic and don't depend on
Screener.in/NSE/BSE/Yahoo staying reachable or unchanged.

## Current real coverage (stated plainly, not aspirationally)

| Data | Primary | Fallback | Status |
|---|---|---|---|
| Quote / company info | Tier 1 (BSE via `bsedata`; NSE via `nsepython`) | Tier 2 (`yfinance`) | Both wired and tested. NSE itself is frequently blocked at Akamai's edge (see `app/ingestion/tier1_nse_bse.py`) — this is exactly why Tier 2 exists. |
| Price history | Tier 2 (`yfinance`) | — | Wired and tested. |
| Ratios | Tier 3 (Screener.in) | — | Tiers 1/2 don't expose comparable named/computed ratios as raw data. |
| Shareholding pattern | Tier 1 (direct NSE endpoint) | Tier 3 (Screener.in) | Tier 1's response shape is unverified (NSE blocked during development); Tier 3 is verified against two real companies and captures full quarterly history (typically 12 quarters), not just the latest. |
| Financial statements (P&L/BS/CF) | Tier 3 (Screener.in) | — | Tier 1's XBRL parser and PDF table extractor are both implemented and unit-tested against fixtures, but wiring them into the live service needs a filing-URL discovery step (find the latest quarterly XBRL / annual report PDF for a company) that hasn't been built yet. |
| Documents | — | — | Endpoint exists, always returns `[]` until the filing-discovery step above exists. |

See `app/services/fundamentals_service.py`'s module docstring for the same
detail in code, and ROADMAP.md's Phase 4 checklist for what's tracked as
still open.
