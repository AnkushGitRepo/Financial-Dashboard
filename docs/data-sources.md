# Data Sources

Living registry of every external data source (API or scraper) the system depends on. This file describes the system **as it currently stands** — it is never pruned or archived, only updated. Update it the same session a data source is added, changed, or removed.

For each source, record: what it is, the endpoint(s) used, auth/key requirements, rate limits, cost, and — for scraping targets specifically — a ToS check before implementation.

## Policy

- Prefer public/free APIs first.
- **No paid data vendors, full stop** — MarketMitra has no paid tier, no billing, no trial limits ([ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md)). This supersedes the earlier "paid APIs where public ones don't cover the need" allowance — an earlier plan involving a paid vendor (EODHD) was dropped for exactly this reason.
- Scraping is last resort, only for data with no free API alternative, and requires a ToS review flagged and resolved before implementation (not built first and checked later).

## Active sources

### NSE (National Stock Exchange) public endpoints
- **Type:** public API (unofficial — no formal developer program or SLA)
- **Used for:** quotes, corporate actions, IPO data (`nsepython`), shareholding pattern (direct call to `/api/corporates-holdings`), XBRL quarterly result filings
- **Endpoint(s):** `www.nseindia.com/api/*` — via the `nsepython` library, plus a direct `httpx` call for `/api/corporates-holdings` (not wrapped by any library)
- **Auth:** none — but requires replicating a browser session/cookie handshake (visit the homepage first) or requests are rejected
- **Rate limits:** no official published limit; ~3 req/s is the community-reported practical ceiling, respected as etiquette in `app/ingestion/rate_limit.py`
- **Cost:** free
- **ToS notes:** NSE's site terms don't sanction automated collection of these endpoints. In practice, NSE enforces this at the infrastructure level — this project's own dev environment was blocked outright by NSE's Akamai edge (403 on a plain homepage GET) during development. Accepted trade-off, documented plainly in [ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md) — not presented as an officially sanctioned integration.

### BSE (Bombay Stock Exchange) public endpoints
- **Type:** public API (unofficial), via the `bsedata` library
- **Used for:** quotes (fallback/companion to NSE within Tier 1)
- **Endpoint(s):** wrapped by `bsedata`; not called directly
- **Auth:** none
- **Rate limits:** none published; treated with the same etiquette as NSE
- **Cost:** free
- **ToS notes:** same unofficial-access caveat as NSE. Verified working live during development in the same environment where NSE was blocked — the two exchanges did not fail together.

### Yahoo Finance (`yfinance`)
- **Type:** public API (unofficial, reverse-engineered — no formal support contract from Yahoo)
- **Used for:** Tier 2 fallback — live/historical price data, and quote-field gap-fill (company name, industry, sector) when Tier 1 doesn't return them. Also the sole backing source for `GET /indices` and for `GET /quote` (batched live quote — last price / prev close / intraday % / 52-week range — polled by the Phase 5 alerts engine, see [ADR 0014](./decisions/0014-alerts-engine-scope.md)); NSE/BSE are blocked from this environment and Screener.in is fundamentals-only, so yfinance is the only viable source for index-level and intraday-quote data.
- **Endpoint(s):** wrapped by the `yfinance` library
- **Auth:** none
- **Rate limits:** none officially published; `yfinance` handles its own request pacing
- **Cost:** free
- **ToS notes:** unofficial API with no SLA — accepted trade-off per ADR 0011. Verified working live during development.

### Screener.in
- **Type:** scraper (Tier 3, last resort)
- **Used for:** named/computed ratios (P/E, ROCE, ROE, etc.) not available as raw data from Tiers 1–2; also a fallback for shareholding pattern and financial statement line items
- **Endpoint(s):** `https://www.screener.in/company/<symbol>/consolidated/`, via `scrapling`'s static `Fetcher`
- **Auth:** none
- **Rate limits:** none published; retries with backoff on failure, see `app/ingestion/tier3_screener_scrapling/scraper.py`
- **Cost:** free
- **ToS notes:** Screener.in is a community/personal site, not a documented API, and its terms don't contemplate automated scraping. Reviewed and accepted as a known trade-off in [ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md) — kept in an isolated, swappable module specifically because of this risk. Selectors verified against two independent real companies' pages (Reliance via live fetch, Newgen Software via a maintainer-saved page used as a permanent test fixture).

### Indian markets RSS feeds (news)
- **Type:** public RSS feeds (offered for syndication)
- **Used for:** the global markets news stream (Phase 6, [ADR 0015](./decisions/0015-news-feed-scope.md))
- **Endpoint(s):** Economic Times Markets, LiveMint Markets, The Hindu BusinessLine Markets, Moneycontrol Business — exact URLs in `services/fundamentals-api/app/ingestion/news.py` (`BROAD_FEEDS`). Business Standard's markets RSS was evaluated but 403s to non-browser clients, so it's excluded (as is NDTV Profit's feedburner feed — too much non-markets content).
- **Auth:** none
- **Rate limits:** none published; polled at most every `news_broad_cache_ttl_minutes` (~30 min) via lazy refresh-on-read
- **Cost:** free
- **ToS notes:** these are RSS feeds the outlets publish for syndication. MarketMitra stores and displays only the headline, the short RSS summary, the publish timestamp, and a link back to the original article — no article body is fetched or scraped. Each item links out to the source. This is ordinary RSS consumption, not scraping; reviewed 2026-09-06.

### Google News RSS
- **Type:** public RSS (Google-provided search-results feed)
- **Used for:** per-company news on the stock-detail and portfolio views (Phase 6) — one query per company name (`"<name>" NSE`), giving an exact symbol tag by construction
- **Endpoint(s):** `https://news.google.com/rss/search?q=...&hl=en-IN&gl=IN&ceid=IN:en`
- **Auth:** none
- **Rate limits:** none published; one request per tracked/held symbol, at most every `news_symbol_cache_ttl_minutes` (~60 min) via lazy refresh
- **Cost:** free
- **ToS notes:** Google News RSS is a public feed Google serves; entries link back to the publishers (via `news.google.com` redirects) and MarketMitra keeps only headline + summary + link + timestamp, no article bodies. Reviewed 2026-09-06.

<!--
Template for a new entry:

### <Source name>
- **Type:** public API | paid API | scraper
- **Used for:** <feature(s) that depend on this>
- **Endpoint(s):** <base URL / specific endpoints>
- **Auth:** <API key env var name, or none>
- **Rate limits:** <requests/min, daily quota, etc.>
- **Cost:** <free tier limits, paid tier cost>
- **ToS notes:** <only for scraping — link/summary of terms reviewed, date reviewed>
-->
