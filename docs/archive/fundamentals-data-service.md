# Archive — Fundamentals Data Service + Real-Data Dashboard Wiring (Phase 4)

Signed off 2026-09-06. Live summary in [`/docs/architecture.md`](../architecture.md); decisions in
[ADR 0011](../decisions/0011-three-tier-fundamentals-data-sourcing.md),
[ADR 0012](../decisions/0012-portfolio-holdings-and-real-data-wiring.md),
[ADR 0013](../decisions/0013-fundamentals-api-vercel-hosting.md),
[ADR 0016](../decisions/0016-landing-page-no-paid-tier-reconciliation.md).
Service reference: [`services/fundamentals-api/README.md`](../../services/fundamentals-api/README.md).

## What shipped

A standalone Python/FastAPI service under `services/fundamentals-api/` (scoped exception to
ADR 0004's "no separate server" — Python-only tooling, no TS equivalent) that serves
screener.in-style data: ratios, historical financial statements, shareholding pattern,
peer comparison, About text, annual-report PDFs, price history, batched live quotes,
indices, and a full-NSE-universe search. Postgres-backed (SQLAlchemy async + asyncpg,
Alembic), a per-service exception to the MongoDB default because the data is tabular.

The four dashboard surfaces (`/dashboard`, `/dashboard/portfolio`, `/dashboard/markets`,
`/dashboard/stock/[ticker]`) were built from an approved Claude Design import (fonts swapped
to Manrope / JetBrains Mono) and wired to real data — **all mock data deleted**
(`src/lib/dashboard/mockData.ts` gone). The Phase 3 sidebar-nav empty-state shell
(`Sidebar.tsx`) was deleted outright, not archived-and-kept, since nothing referenced it.

## Three-tier free-data fallback chain

Tried **per field**, not per data type (`app/ingestion/orchestrator.py`); every stored/served
record carries `source_tier`.

1. **Tier 1 — NSE/BSE** (`nsepython` / `bsedata`, direct call to NSE `/api/corporates-holdings`
   for shareholding, `xbrl_parser.py` + `pdf_financials.py` for statements).
2. **Tier 2 — `yfinance`** (price history, quote-field gap-fill). This *replaced the dropped
   paid vendor* (EODHD) entirely — see ADR 0011.
3. **Tier 3 — Scrapling against Screener.in** (`app/ingestion/tier3_screener_scrapling/`,
   isolated module + own README) — last resort, mainly named ratios Tiers 1–2 don't expose.

### Load-bearing gotcha: NSE blocks non-browser / non-Indian traffic

Confirmed in development — a plain homepage GET from this project's dev environment returns
403 at the Akamai edge. `bsedata`, `yfinance`, and Screener.in all worked live from the
same blocked environment. This is *why* Tiers 2–3 are real fallbacks, not formalities.
The NSE equity list for `/search` is fetched from `archives.nseindia.com` (reachable) rather
than `www.nseindia.com` (blocked).

## Endpoints added over the phase

`GET /companies/{symbol}` · `/ratios` · `/shareholding` · `/financials` · `/prices` ·
`/documents` · `/peers` · `GET /indices` (yfinance, served live not persisted — indices
aren't companies) · `GET /search?q=` (~2,570 NSE equities + 4 indices, name/symbol prefix) ·
`GET /quote?symbols=` (batched live quote, added in Phase 5 but part of this service).
All in [`/docs/api-surface.md`](../api-surface.md) and the service README's coverage table.

## Gotchas & bugs found in the process

- **Shareholding scraper only captured the latest quarter** — Screener shows ~12 quarters of
  history. Fixed to capture all available quarters.
- **Peer comparison lazy-loads on Screener for some large caps** — an AJAX fallback was added;
  confirmed working for Reliance, *not* for TCS. Accepted as an unofficial-access
  inconsistency, not a chased bug.
- **`about` text** is backfilled once per company (not TTL-refreshed like ratios).
- **Annual reports** come straight from Screener's BSE-hosted PDF links — no Tier 1
  filing-discovery needed for that specific document type.
- **MongoDB Atlas had no connection timeout** — an unreachable cluster hung every page load
  ~20–30 s. Fixed with `serverSelectionTimeoutMS: 5000` in `src/lib/mongodb.ts`; callers
  treat a rejected `getDb()` as "show an empty/unavailable state," not a crash. (This same
  helper later interacted with the Phase 8 cold-start bug — see `ai-insights.md`.)
- **MongoDB Atlas IP allowlist** — the user opened it to `0.0.0.0/0`; portfolio holdings
  add/edit/delete then verified live end-to-end, not just built.

## Portfolio: a genuinely new feature

`holdings` MongoDB collection + `/api/holdings` CRUD (`src/lib/holdings.ts`,
`src/lib/currentUserId.ts` for the hosted/`"local"` user-id split) + add/edit/delete UI.
Live LTP/sector per holding from fundamentals-api (`enrichedHoldings.ts`). Historical
portfolio value (`portfolioHistory.ts`) is a real-data *approximation* — current quantities
applied to real historical prices, not a transaction ledger — captioned as such in the UI.

**Dropped, not faked:** diversification score, target progress, sector-vs-benchmark,
drift-from-target — their mock numbers were hardcoded constants even in the source design,
so they were removed rather than kept as decoration. Replaced with real concentration facts,
sector allocation, and per-holding unrealized P&L. See ADR 0012.

## Company logos with a real fallback

`src/components/dashboard-charts/CompanyLogo.tsx` — real per-symbol logos from a
community-maintained open directory (`dharunashokkumar.github.io/indian-listed-company-logos`,
sourced from TradingView's icons), falling back to text initials only on a genuine load
failure. Confirmed the directory 404s for real on unlisted tickers, so the fallback is real.

## Hosting (ADR 0013)

Vercel Python serverless function + Neon Postgres marketplace integration, both inside the
existing Vercel account (no new third-party accounts). Live at
`https://marketmitra-fundamentals-api.vercel.app`. The deployed function uses a **separate,
trimmed `requirements.txt`** (not `pyproject.toml`'s full set) and fetches Tier 3 via
`httpx` + `scrapling.parser.Selector` directly rather than `scrapling.fetchers.Fetcher`,
whose import chain pulls in a ~130 MB Playwright driver the function never uses.

**Standing deploy mechanism:** both projects deploy via the Vercel CLI
(`vercel deploy --prod --yes`), not the old per-file MCP upload — much cheaper for a
~95-file Next.js app. CLI session authenticated as the user, persists locally.

## Known gap — closed 2026-09-06 (post-sign-off)

**Tier 1 filing-URL discovery** — the step that finds a company's latest quarterly XBRL /
annual-report PDF so financial statements aren't a Screener scrape — was built after Phase 4
sign-off. `app/ingestion/filing_discovery.py`: NSE `/api/corporates-financial-results`
(primary) → BSE `AnnGetData` (fallback) → most-recent results filing → the existing
`xbrl_parser` / `pdf_financials` extract it as the latest period; Screener still fills the
history and is the fallback when discovery returns nothing. The NSE fetch is unverified from
a blocked environment (parsers fixture-tested, `tests/test_filing_discovery.py`); every
failure collapses to "Tier 1 had nothing" so there's no regression. `financials_tier1_enabled`
config flag. Remaining: verify the NSE/BSE parsers against real live responses and correct
the field maps; multi-period XBRL context extraction.

## Testing

All fundamentals-api tests run **offline** (no network, no DB) against saved fixtures — a
real Screener.in page saved by the maintainer (two companies' pages agree on selectors), a
taxonomy-accurate synthetic XBRL fixture, a generated PDF with a ruled table. 30/30 at
phase end (was 25 before peers/About/documents).
