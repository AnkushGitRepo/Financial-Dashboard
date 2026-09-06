# 0015: News feed — Phase 6 scope, sourcing, and architecture

Date: 2026-09-06
Status: accepted (scoping decision — no code written yet)

## Context

Phase 6 in `ROADMAP.md` was a one-line placeholder marked ❓ ("source(s)
for news, how it's matched to specific companies/portfolio holdings,
refresh cadence"). This ADR is the output of the dedicated scoping
session. v1 code and the build checklist live in `ROADMAP.md` under
Phase 6.

Relevant existing state:

- **No news code in v2.** v1's Financial-Dashboard had a "news sentiment"
  feature in its Python scraper; nothing carried over (ADR 0001).
- **`services/fundamentals-api`** (ADR 0011) is the established data-
  ingestion service: FastAPI + Postgres, a three-tier free-data chain, a
  `company_master` table (~2,570 NSE names), and a "serve from Postgres
  unless stale, then re-ingest" cache pattern (`*_cache_ttl_hours` in
  `config.py`). It's consumed directly by Next.js Server Components.
- **No paid data vendors** — free sources only (ADR 0011).
- **Phase 5** shipped a generic notification subsystem
  (`deliverNotification`) and a cron pattern; both are available for a
  later "news alerts" follow-up but are **not** used in Phase 6 v1.

Scoping answers (user): **hybrid sourcing**, **all three surfaces**
(portfolio / stock-detail / global), **feed + sentiment tag** (no
notifications in v1), **ingestion in `fundamentals-api`**.

## Decisions

### 1. Hybrid sourcing — broad RSS + Google News RSS per symbol

**Broad market feeds** power the global stream: a small fixed set of
Indian-markets RSS feeds (Economic Times Markets, Moneycontrol,
Business Standard Markets, LiveMint Markets — final list in the build).
Parsed with `feedparser`. Per-item fields: title, canonical link,
summary, published-at, source name. Company tagging for these is
**best-effort**: match item text against `company_master`, but only on a
company's full registered name or a known short name with word
boundaries — short/common tokens are deliberately not matched (a "news
item → 0..N symbols" relation, empty is fine).

**Google News RSS, one query per symbol**, powers the stock-detail and
portfolio views:
`https://news.google.com/rss/search?q="<company name>" NSE&hl=en-IN&gl=IN&ceid=IN:en`.
Items are tagged with that symbol **by construction** — no matching
guesswork. Run for the union of: every symbol any user currently holds,
plus a curated tracked set (the existing 10-symbol watchlist + a short
large-cap list) so popular stock pages have news even with no holders.
Google News links are `news.google.com` redirects — store the Google URL;
resolving the publisher URL is best-effort, not required.

Rejected: entity-tagging news APIs (marketaux/GNews/NewsAPI) — all are
vendors with request-capped free tiers or dev-only ToS, against ADR 0011's
"free sources only". FinBERT-style sentiment models — too heavy for the
serverless function.

### 2. Ingestion in `fundamentals-api`, lazy TTL refresh (no new cron)

News fetch / parse / sentiment / store all live in `fundamentals-api`
(`app/ingestion/news.py`), following ADR 0011's data-service pattern. It
already has `feedparser`-friendly tooling territory, the company master,
and Postgres.

**Refresh is lazy, TTL-gated** — the same mechanism as ratios/prices:
a read serves from Postgres unless the newest relevant item is older than
`news_cache_ttl_minutes` (broad feeds ~30 min; per-symbol ~60 min), in
which case that read triggers a re-fetch first. This sidesteps the Vercel
Hobby daily-cron limit entirely (cf. ADR 0014's amendment). The Phase 5
GitHub Actions workflow *may* later also ping a `POST /news/refresh` to
keep it warm, but v1 doesn't depend on any scheduler.

Storage — two new Postgres tables:
- `news_items`: `id, url (canonical, UNIQUE — dedup key), title, summary,
  source, published_at, sentiment (enum: positive|neutral|negative),
  sentiment_score (numeric), fetched_at`.
- `news_item_symbols`: `(news_item_id, symbol)` many-to-many, indexed
  `(symbol, published_at desc)`.
Retention: prune items older than 30 days on each ingest, so the tables
stay bounded.

### 3. Sentiment: VADER on the headline, labelled honestly

Each item gets a 3-way tag computed at ingest with **VADER**
(`vaderSentiment`, lexicon+rule based, pure Python, no model download) run
on `title` (+ `summary` when present); compound score → `positive` (≥
0.05) / `negative` (≤ −0.05) / `neutral`. Stored on the row.

This is explicitly **headline tone, not analyst/market sentiment** — the
UI labels it that way, and it is not presented as a trading signal.
LLM-based sentiment and summarisation are Phase 8. A finance-tuned
lexicon (Loughran-McDonald) layered on VADER is a possible follow-up, not
v1.

### 4. API (on `fundamentals-api`) + surfaces

- `GET /news?limit=&cursor=` — global feed, newest first, cursor-
  paginated.
- `GET /news?symbols=A,B,C&limit=&cursor=` — items tagged with any of
  those symbols (the Next.js Portfolio page passes the user's holding
  symbols; the stock page passes one).
- Response item: `{ url, title, summary, source, published_at, sentiment,
  sentiment_score, symbols[] }`.

Documented in the `fundamentals-api` README + a pointer in
`/docs/api-surface.md` (same "consumed service, not a new MarketMitra
route" treatment as `/quote` and `/search`). A thin `/api/news` Next.js
proxy is added **only if** the global feed grows client-side infinite
scroll; the Server-Component reads below don't need it.

**Next.js surfaces:**
- `/dashboard/news` — global markets feed page, in the app shell, newest
  first, with a **"My holdings" toggle** (`?filter=holdings`) that swaps
  to the symbol-filtered query. "News" added to the header nav; on mobile
  it replaces the disabled "Profile" tab.
- `/dashboard/stock/[ticker]` — a "News" card (Server Component fetches
  `GET /news?symbols=<ticker>`).
- `src/lib/dashboard/newsApi.ts` — the client, mirroring
  `fundamentalsApi.ts` (returns `[]`/null on failure; callers render an
  honest empty state).
- Built against `/docs/design-system.md`; sentiment shown as a small
  colour-coded dot/pill (reuse `--app-gain` / `--app-loss` / a muted
  neutral).

### 5. Explicitly out of Phase 6 v1

- **Notifications on news** — the user chose sentiment over this for v1.
  `deliverNotification` (Phase 5) is ready for it as a follow-up.
- LLM sentiment / summarisation / dedup of near-duplicate stories across
  outlets (Phase 8 / later).
- Full article text or a reader view — we show title + summary + a link
  out, nothing scraped from article bodies.
- Non-English news; user-configurable sources or per-source muting;
  saved/read state per user.

## Consequences

- `fundamentals-api` gains `feedparser` + `vaderSentiment` deps (both pure
  Python, small — fine for the Vercel function) in `pyproject.toml` and
  the trimmed `requirements.txt`, plus one Alembic migration for the two
  tables.
- News is real, free-sourced, and honestly labelled (headline tone, links
  back to publishers, no scraped article bodies). Each RSS source and the
  Google News RSS usage gets a `data-sources.md` entry with a ToS line.
- The lazy-TTL refresh means the *first* visitor after a TTL window eats a
  fetch latency (a few seconds); acceptable, and identical to how
  ratios/prices already behave.
- Phase 10 (RAG chat) can later use `news_items` as a retrieval corpus —
  the table is kept plain and queryable with that in mind.
- No change to the deployment-mode gate: news is public market data, works
  identically in hosted and self-host; the portfolio-filtered view just
  passes whatever `getCurrentUserId()` resolves.
