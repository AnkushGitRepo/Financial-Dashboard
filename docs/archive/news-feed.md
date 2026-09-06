# Archive — News Feed (Phase 6)

Signed off 2026-09-06. Live summary in [`/docs/architecture.md`](../architecture.md);
full rationale in [ADR 0015](../decisions/0015-news-feed-scope.md).

## What shipped

A free-RSS-only news feed with three surfaces — a global `/dashboard/news` page with an
"All markets / My holdings" toggle, and a "Recent news" card on `/dashboard/stock/[ticker]`.
Ingestion lives in `fundamentals-api` with **lazy TTL refresh-on-read** (no new cron —
sidesteps the Hobby daily-cron limit). Each item carries a VADER **headline-tone** label.
**No news notifications in v1** (Phase 5's `deliverNotification` is ready for that later).

## Sourcing — hybrid, by design

- **Global stream:** 4 broad Indian-markets RSS feeds — ET, LiveMint, BusinessLine,
  Moneycontrol. Business Standard 403s bots; NDTV Profit was too noisy — **both dropped on
  evidence**, not assumption.
- **Stock / portfolio views:** Google News RSS, one query per company name — exact symbol
  tagging by construction, free, no vendor.
- **Tagging on the broad stream is best-effort:** only a company's distinctive *multi-word*
  name, whole and word-bounded (`matcher_name` / `build_name_pattern` reject short or
  single-word names to avoid false hits).

## Backend (`fundamentals-api`)

- **Deps:** `feedparser` + `vaderSentiment`. Config: `news_broad_cache_ttl_minutes` (30),
  `news_symbol_cache_ttl_minutes` (60), `news_retention_days` (30).
- **Migration `31f04c1b3507`** — `news_items` (deduped on `url`, `published_at` indexed) +
  `news_item_symbols` (`symbol` indexed). Hand-written (no local Postgres to autogenerate).
- **`app/ingestion/news.py`** — `fetch_broad_items()`, `fetch_symbol_items()`,
  `tag_symbols()`, `score_sentiment()` (VADER → 3-way + rounded score), HTML-stripped
  summaries. All sync work via `asyncio.to_thread`.
- **`app/services/news_service.py`** — `get_news()` with lazy TTL refresh, keyset cursor
  pagination (`_encode_cursor` / `_decode_cursor`), URL-dedup upsert + symbol linking,
  30-day prune, name-index from `company_master`, `refresh_all()` for an optional warm-up.
- **`GET /news?symbols=&limit=&cursor=`** → `{ items[], next_cursor }`.

## Frontend (Next.js)

- `src/lib/dashboard/newsApi.ts` — `getNews({symbols?, limit?, cursor?})`, returns an empty
  page on failure. `GET /api/news` — thin same-origin proxy for client-side pagination/toggle
  (like `/api/search`).
- `/dashboard/news` — server `page.tsx` (first global page + the user's holding symbols),
  `NewsFeedClient.tsx` (toggle + cursor "Load more" + honest empty states). Shared `NewsList`
  + `NewsList.module.css` in `dashboard-charts/` — sentiment dot, source, relative time,
  links out. Also renders the stock-page "Recent news" card.
- "News" added to `AppHeader` nav; `MobileTabBar`'s disabled "Profile" tab swapped for "News".

## The sentiment caveat (deliberate framing)

VADER uses a generic lexicon that skews optimistic on financial text. The label is stored
and shown, but the page intro and every dot `title` call it **"headline tone… not analysis,
and not a signal."** LLM sentiment was explicitly left to Phase 8.

## Deployment mode

No `isHosted()` gating — news is public; the holdings filter just uses whatever
`getCurrentUserId()` resolves.

## Tests

14 offline tests in fundamentals-api (`test_news.py` — RSS fixtures for broad + Google News,
name-matching, VADER labelling, cursor round-trip, staleness, route shape / 422); suite
50/50. Next.js side (`npm test` 78) unchanged by this phase — verified live against a local
Postgres with the migration applied.

## Deployment (2026-09-06)

Migration `31f04c1b3507` applied to prod Neon (`alembic current` → head); fundamentals-api
redeployed — prod `/news` verified (global + `?symbols=RELIANCE` + cursor). `marketmitra-v2`
redeployed — prod `/api/news` proxy verified; landing / `/api/search` / `/sign-in`
regression-clean.

**Non-regression noted:** `/dashboard/news` (like every `/dashboard/*`) returns a
Clerk-dev-instance rewrite to bare `curl` — a real signed-in browser is needed to see it
render in prod. Verified signed-in in the Phase 4–8 prod verification pass.

## Explicitly out of v1 scope (ADR 0015)

Notifications on news, LLM sentiment/summarisation, near-duplicate-story dedup across
outlets, full article text / reader view, non-English news, user-configurable sources or
per-source muting, per-user saved/read state.
