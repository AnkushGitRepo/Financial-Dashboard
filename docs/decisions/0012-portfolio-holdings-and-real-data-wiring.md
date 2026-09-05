# 0012: Portfolio holdings storage, real-data wiring for the dashboard UI, and dropped analytics widgets

Date: 2026-09-05
Status: accepted

## Context

The dashboard/portfolio/markets/stock UI (built from an approved Claude
Design import, see the Dashboard app shell section of
`/docs/architecture.md`) launched running entirely on mock data. The user
explicitly asked for real data, sourced from `services/fundamentals-api`
(ADR 0011), with no fictional companies or invented numbers.

Three different real-data problems needed solving, each with a different
answer:

1. **Stock detail** (ratios, financials, shareholding, price history) —
   directly served by fundamentals-api for any real NSE symbol. No new
   backend needed, just wiring.
2. **Portfolio holdings** (a user's positions, quantity, P&L, allocation) —
   fundamentals-api has no concept of a user's portfolio at all (it's a
   company-data service, not an account service). This data has never
   existed anywhere in the system. User's explicit choice: build it now as
   real, working functionality, not defer it.
3. **Markets page** (index quotes, top gainers/losers) — fundamentals-api
   has no market-wide index or screener endpoint. User's explicit choice:
   replace the fictional indices (MM Broad 50, etc.) with real Indian
   indices; gainers/losers scoped to a small real watchlist rather than a
   market-wide screener fundamentals-api has no way to serve.

## Decisions

### Real Indian indices via yfinance (Tier 2), served live, not cached

Added `app/ingestion/indices.py` and `GET /indices` to fundamentals-api:
NIFTY 50 (`^NSEI`), SENSEX (`^BSESN`), NIFTY BANK (`^NSEBANK`), INDIA VIX
(`^INDIAVIX`) — all verified live via yfinance. Served on each request
rather than persisted to Postgres: index quotes change constantly and are
cheap to fetch, so caching would mostly add staleness risk. This is a
company-agnostic addition to the ingestion layer, alongside (not replacing)
the three-tier per-company fallback chain from ADR 0011.

### A small real watchlist replaces fictional tickers

`src/lib/dashboard/watchlist.ts` — ten real NSE large-caps (RELIANCE, TCS,
HDFCBANK, INFY, ICICIBANK, SBIN, ITC, LT, HINDUNILVR, BHARTIARTL), each
verified to resolve via the fundamentals-api. Used for Markets page search
suggestions and "top gainers/losers" — the latter explicitly scoped to
*this watchlist's* daily movement, not a market-wide screener, since no
data source for that exists. Panel titles say "(watchlist)" rather than
implying market-wide coverage.

### Shareholding scraper fixed to capture full quarterly history

`tier3_screener_scrapling/scraper.py`'s `_parse_shareholding` previously
only kept the most recent quarter's column per category — a real,
newly-discovered limitation, not by design. Fixed to return one entry per
(category, quarter) across every column Screener shows (typically 12
quarters), so the shareholding trend chart uses real historical data
instead of a single repeated point. No schema change needed — the existing
`(company_id, category, quarter_end)` unique constraint already supported
multiple quarters per category; only the scraper's parsing was too narrow.

### Portfolio holdings: MongoDB, a genuinely new MarketMitra-owned feature

A new `holdings` collection in the main app's existing MongoDB Atlas
database (ADR 0007) — not Postgres/fundamentals-api, since this is
per-user account data belonging to the main app, not company fundamentals
data. Schema: `{ _id, userId, symbol, quantity, avgPrice, createdAt,
updatedAt }`. `userId` is the real Clerk user id in hosted mode, or the
fixed string `"local"` in self-host mode (ADR 0010's established
single-local-user placeholder — centralized in `src/lib/currentUserId.ts`
so this pattern isn't reinvented per feature).

Because this is new data MarketMitra itself owns (unlike fundamentals-api,
which is an existing service being consumed), it gets a real, documented
Next.js API route per ADR 0004 and the project's "ship UI + documented API
together" rule: `GET/POST /api/holdings`, `PATCH/DELETE /api/holdings/[id]`
— see `/docs/api-surface.md`. Input validated with Zod. The Portfolio page
itself calls the data-access functions (`src/lib/holdings.ts`) directly
from its Server Component for its initial render (avoiding a pointless
internal HTTP round-trip); the API routes exist for the client-side
add/edit/delete UI to call.

**Consuming fundamentals-api directly from Server Components, not proxied
through a Next.js route:** `src/lib/dashboard/fundamentalsApi.ts` calls the
Python service's already-documented HTTP endpoints server-side. This is
scoped as "consuming an existing service," not "shipping a new endpoint" —
distinct from the holdings feature above, which *is* new MarketMitra data
and does get its own route. Every fundamentals-api call returns `null` on
failure (network error, service down, unrecognized symbol) rather than
throwing — callers must render an honest "data unavailable" state, not
crash or silently substitute fake data.

### Historical portfolio value: real prices, approximated timeline

There's no transaction ledger (no stored buy dates), so a true
historical portfolio-value-over-time chart isn't possible yet. Implemented
`getPortfolioValueHistory()` (`src/lib/dashboard/portfolioHistory.ts`):
applies *current* holding quantities to each symbol's real historical
closes and sums per day — "what this book would be worth on past dates,
holding what you hold today." This uses entirely real price data, not
fabricated numbers, but isn't equivalent to true historical performance.
Captioned as an approximation in the UI (both Dashboard and Portfolio
pages) rather than presented as exact history.

### Widgets dropped — no real data or config source exists yet

Removed from the mock design rather than kept as fake data:

- **Diversification score (0-100)** and **Target progress** (%-to-goal) —
  the source design's own numbers were hardcoded constants, not derived
  from the mock holdings either; no real formula or user-set goal exists to
  compute these honestly.
- **Sector mix vs. benchmark** and **Drift from target allocation** — both
  need data/config nothing in the system has: real index constituent
  sector weights (no data source found), and user-configurable target
  allocations per sector (a preferences feature that doesn't exist).

Kept, computed for real from actual holdings + live quotes: current value,
invested, total P&L, sector allocation (from each holding's real
`sector` via fundamentals-api), the holdings table with live LTP/P&L,
per-holding unrealized gain/loss ("contributors," sorted), and
concentration facts (top-3 %, largest position, sector count).

## Consequences

- The dashboard's financial data is now real (fundamentals-api, MongoDB
  holdings) end to end, with two narrow, explicitly-documented exceptions:
  the "Mitra" AI assistant's insights/replies remain scripted demo content
  (`src/lib/dashboard/aiWidgetContent.ts`) — genuinely wiring that up is
  Phase 8 (AI Insights), a separate, not-yet-scoped phase; and portfolio
  history is a real-data approximation, not true transaction history.
- Self-hosted deployments share one `"local"` holdings owner, same as
  every other self-host single-user placeholder in this project — a real
  self-host login/multi-user story remains an open, deferred decision
  (ADR 0010).
- `services/fundamentals-api` must be running (`FUNDAMENTALS_API_URL`) for
  any of Dashboard/Portfolio/Markets/Stock to show real data; when it's
  unreachable, pages degrade to honest empty/unavailable states rather than
  erroring or silently reverting to mock numbers.

## Amendment (same day): company logos, full-universe search, MongoDB confirmed reachable

Three follow-up requests, addressed as extensions of this same ADR rather
than a new one since they're the same "no dummy data" commitment applied
further:

**MongoDB Atlas confirmed reachable** — the user opened the cluster's IP
access list to `0.0.0.0/0`, resolving the TLS-level rejection noted above.
Re-verified live: the full holdings add/edit/delete flow now works
end-to-end (not just built-and-assumed) — added a position, edited its
quantity, removed it, each change reflected immediately via real Mongo
reads/writes and `router.refresh()`. Also fixed `src/lib/mongodb.ts` to add
`serverSelectionTimeoutMS: 5000` (no timeout was set before — an
unreachable cluster hung every page load for the driver's ~30s default;
this was found and fixed while the connection was still blocked, and
verified again for regressions once the allowlist opened).

**Real company logos, initials as true fallback**: `src/components/
dashboard-charts/CompanyLogo.tsx` renders `https://dharunashokkumar.github
.io/indian-listed-company-logos/nse/NSE_{symbol}.svg` (a community-
maintained open directory, sourced from TradingView's own per-symbol icon
set) and falls back to initials only on a real image load error.
Confirmed both paths for real: the directory 404s for genuinely unlisted
tickers (fallback engages correctly), and returns a valid — if sometimes
generic-looking — icon for every real NSE symbol tested, including small/
mid-caps (these are TradingView's own default per-symbol icons, not a bug
in the fallback logic; verified by inspecting actual response bytes, not
assumed). Wired into every avatar spot: `MoverPanel`, `HoldingRow`, the
stock detail page's header, and the new search dropdown below.

**Full NSE-universe + indices search**: the Markets page search (and the
header search, for consistency) previously only suggested the 10-symbol
watchlist. Now searches all ~2,570 NSE-listed equities plus the four
tracked indices. Source: NSE's own `archives.nseindia.com/content/
equities/EQUITY_L.csv` — confirmed reachable (unlike `www.nseindia.com`,
blocked per ADR 0011) and parsed into a new `company_master` Postgres
table (`app/ingestion/company_master.py`, lazily populated on first
search, ~2,570 rows). New `GET /search?q=` on fundamentals-api
(`app/services/search_service.py`), consumed via a thin Next.js proxy
route (`/api/search` — a deliberate, narrow exception to the "consume
fundamentals-api directly from Server Components" rule above, needed so
the browser has a same-origin endpoint for live-as-you-type search without
CORS setup on the Python service or exposing `FUNDAMENTALS_API_URL` to
client code). Debounced client-side via `useSymbolSearch()`, rendered by
a shared `SearchResultsDropdown` component. Verified live: searching
"tata" returns all 13 real Tata-group NSE listings; selecting one
navigates to its real stock detail page.
