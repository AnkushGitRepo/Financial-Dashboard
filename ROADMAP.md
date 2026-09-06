# MarketMitra v2 — Master Build Roadmap

This is the entry-point document for building MarketMitra v2 across many sessions and many days. Read this first in any new chat, alongside `CLAUDE.md`. This document tracks *what phase we're in and what's left in it* — `CLAUDE.md` stays a short pointer, `/docs/architecture.md` describes the system as it stands, and this file is the actual working checklist.

## How to use this document

- Find the current phase (marked 🔄 below). Read its checklist. Work through unchecked items in order unless they're explicitly parallel.
- **After completing any single checklist item** — not just at the end of a phase — do all of the following before moving to the next item:
  1. Check the box in this file.
  2. If the item involved a real decision (a library choice, a schema choice, a structural change), add or update an ADR in `/docs/decisions/`.
  3. If the item changed the system's structure, update `/docs/architecture.md`.
  4. Append one line to `/docs/session-log.md`.
- This is more frequent than the archiving/pruning protocol from earlier — pruning old detail into `/docs/archive/` only happens when the user explicitly approves a phase as done. Checking boxes and logging happens continuously, every session, without waiting for approval.
- When a phase is fully checked off, stop and tell the user it's ready for review — don't self-approve and move to the next phase or run the pruning protocol without their explicit sign-off.
- Legend: ✅ Done · 🔄 In progress · ⬜ Todo · ⏸️ Deferred (no ETA) · ❓ Needs a dedicated discussion session before any build prompt is written — do not build from assumptions here.

---

## Phase 0 — Context Architecture ✅
`CLAUDE.md`, `/docs/decisions/`, `/docs/architecture.md`, `/docs/session-log.md`, `/docs/archive/` structure in place.

## Phase 1 — Teardown ✅
v1 code removed, history preserved, teardown committed as its own commit.

## Phase 2 — Scaffold + Deployment-Mode Gate ✅
- [x] Next.js (App Router, TypeScript) scaffold, ESLint/Prettier
- [x] Clerk deployed on the production (hosted) instance
- [x] Implement `NEXT_PUBLIC_DEPLOYMENT_MODE` (`hosted` | `selfhost`, defaults to `selfhost`) gate — see [ADR 0010](./docs/decisions/0010-deployment-mode-gate.md); implemented in `src/lib/deployment-mode.ts` + gated at every Clerk/billing mount point
- [x] Set `NEXT_PUBLIC_DEPLOYMENT_MODE=hosted` explicitly in the production Vercel environment — confirmed done by user 2026-09-04
- [x] Verify self-host mode skips Clerk and all billing UI entirely — confirmed 2026-09-04: `/dashboard` opens with 200 (no login), `/sign-in`+`/sign-up` 307-redirect to `/dashboard`, landing page has zero `pricing`/`#faq` references
- [x] Verify hosted mode is unchanged from current behavior once the flag is set — confirmed 2026-09-04: `/dashboard` redirects unauthenticated visitors through Clerk's handshake flow (matches prod), `/sign-in` renders the real widget, pricing section present; `npm run build` / `tsc --noEmit` / `eslint` all clean

## Phase 3 — Landing + Auth + Dashboard Shell ✅
- [x] Landing page design (hero, dashboard preview, features, pricing cards, FAQ, footer)
- [x] Sign-in / sign-up screens — on-brand split layout, border-clipping and composition bugs fixed
- [x] Final landing + auth designs implemented and approved
- [x] Implemented in Next.js + CSS Modules per `/docs/design-system.md`
- [x] Dashboard shell (empty-state layout only, no real feature data yet)
- [x] Responsive/mobile pass on all three surfaces — verified at 390px/820px/1440px+
- **Archiving protocol already run for this phase** — full build detail lives in [`/docs/archive/landing-page.md`](./docs/archive/landing-page.md), [`/docs/archive/dashboard-shell.md`](./docs/archive/dashboard-shell.md), [`/docs/archive/auth-pages.md`](./docs/archive/auth-pages.md); `/docs/architecture.md` holds the current summaries.

## Phase 4 — Fundamentals Data API (screener.in-equivalent) 🔄
Superseded plan: no paid vendor (EODHD dropped), no hosted/self-host split for data access — see [ADR 0011](./docs/decisions/0011-three-tier-fundamentals-data-sourcing.md). Built as a standalone Python/FastAPI service under `services/fundamentals-api/` (scoped exception to ADR 0004), Postgres-backed (not MongoDB, scoped to this service). Full detail: [`services/fundamentals-api/README.md`](./services/fundamentals-api/README.md).
- [x] Storage decision confirmed — PostgreSQL, not MongoDB (this service's data is naturally tabular/relational)
- [x] Schema defined — `app/schemas.py` (pydantic v2) + `app/db/models.py` (SQLAlchemy), migrated via Alembic, applied against a real local Postgres instance
- [x] Tier 1 (NSE/BSE) ingestion built — `nsepython`/`bsedata` quotes, direct-call NSE shareholding endpoint, XBRL parser, PDF table extractor. NSE itself is frequently blocked (Akamai edge, confirmed during dev) — expected, not a bug; `bsedata` verified working live.
- [x] Tier 2 fallback built — `yfinance` (price history + quote gap-fill), replacing the dropped paid-vendor (EODHD) plan entirely
- [x] Tier 3 fallback built — Scrapling against Screener.in, isolated module, verified against two real companies (Reliance live fetch, Newgen Software saved-page fixture)
- [x] Serving layer built — FastAPI endpoints for company/ratios/shareholding/financials/prices/documents, `source_tier` visible on every response; 25 tests pass offline (no network/DB)
- [ ] **Not yet done:** Tier 1 filing-URL discovery step (find a company's latest quarterly XBRL / annual report PDF) — financial-statement serving currently runs through Tier 3 only in practice
- [x] Dashboard/Portfolio/Markets/Stock UI built — `/dashboard`, `/dashboard/portfolio`, `/dashboard/markets`, `/dashboard/stock/[ticker]`, from an approved Claude Design import, fonts swapped to project standard (Manrope/JetBrains Mono).
- [x] UI wired to real data, mock data removed entirely (`src/lib/dashboard/mockData.ts` deleted) — see [ADR 0012](./docs/decisions/0012-portfolio-holdings-and-real-data-wiring.md):
  - Stock detail page: fully real (ratios, financials, shareholding, price history) via fundamentals-api, for any real NSE symbol.
  - Markets/Dashboard: real Indian indices (NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX) via a new fundamentals-api `/indices` endpoint (yfinance); gainers/losers scoped to a real 10-stock watchlist (`src/lib/dashboard/watchlist.ts`), not a market-wide screener (no such data source exists).
  - Portfolio: real, working feature — new `holdings` MongoDB collection + `/api/holdings` CRUD routes + add/edit/delete UI. Diversification score, target progress, benchmark comparison, and drift-from-target were dropped (no real data/config source existed for them even in the mock) in favor of real concentration facts, sector allocation, and per-holding unrealized P&L.
  - Fixed a real bug found in the process: the shareholding scraper only captured the latest quarter, not the full history Screener shows — now captures all available quarters (typically 12).
- [x] Company logos everywhere an avatar shows (movers, holdings, stock header, search) — real per-symbol logos with initials as a genuine fallback (confirmed the source 404s for real on unlisted tickers).
- [x] Search upgraded from the 10-stock watchlist to the full NSE universe — ~2,570 real listed equities + the 4 tracked indices, via a new fundamentals-api `/search` endpoint sourced from NSE's own published equity list.
- [x] MongoDB Atlas connectivity resolved (user opened the IP allowlist to `0.0.0.0/0`) — portfolio holdings add/edit/delete verified live end-to-end, not just built. Also fixed a real resilience bug found along the way: no connection timeout meant an unreachable cluster hung every page load for ~20-30s.
- [x] fundamentals-api hosted in production — Vercel Python serverless function + Neon Postgres marketplace integration, both inside the existing Vercel account (no new third-party accounts created); see [ADR 0013](./docs/decisions/0013-fundamentals-api-vercel-hosting.md). Live at `https://marketmitra-fundamentals-api.vercel.app`, verified end-to-end (`/health`, `/indices`, `/search`, `/companies/{symbol}`, `/companies/{symbol}/ratios` all confirmed serving real data). Next.js app (`marketmitra-v2`) redeployed with `FUNDAMENTALS_API_URL` pointed at it — real data confirmed flowing through `/api/search` in production.
- [x] Peer comparison, About (business description), and annual-report documents added — none of these existed before (peer comparison was never built; the Documents endpoint always returned `[]`). All Tier 3 (Screener.in): `about` backfilled once per company, peer comparison cached with the same TTL as ratios (including an AJAX fallback for large caps whose peer table Screener lazy-loads — confirmed working for Reliance, not for TCS, an accepted unofficial-access inconsistency, not a chased bug), annual reports populated directly from Screener's BSE-hosted PDF links (no Tier 1 filing-discovery needed for this specific document type). New `peer_comparisons` table + `companies.about` column, migrated. Wired into the stock detail page: a new About card, a new Peer comparison table, and the previously-empty Documents card now lists real, clickable annual report PDFs. 30/30 tests pass (was 25).
- [ ] Confirm this phase as done with the user before running the archiving protocol

**Resolved 2026-09-06 — [ADR 0016](./docs/decisions/0016-landing-page-no-paid-tier-reconciliation.md):** landing "Pricing" section reframed as "Two ways to run it" (both free); trial/price/AI-cap UI removed; FAQ rewritten; AI insights are BYO-key in every mode; the hosted shared instance's fair-use **rate limiting is now a stated expectation but not built** — tracked for Phase 9 / infra, below. `isHosted()`'s auth gating unchanged.

## Phase 5 — Alerts (stop loss, target, price / %-move / 52w / portfolio) 🔄
Scoped 2026-09-06 — see [ADR 0014](./docs/decisions/0014-alerts-engine-scope.md) for the full rationale. v1 = four trigger types, in-app notification center as the always-on delivery baseline plus config-gated email + webhook, evaluated by a Vercel Cron hitting a secret-guarded API route ~every 10 min during NSE hours. Delivery is built as a generic notification subsystem so Phase 7/8 reuse it. Full parity in self-host mode (operator triggers the cron route themselves if not on Vercel).

**Backend — fundamentals-api (one new endpoint):**
- [x] `GET /quote?symbols=A,B,C` — batched live quote: `{ symbol, price, prev_close, change_pct, week52_high, week52_low, as_of, source_tier }`, yfinance `fast_info` backed, 60s in-process TTL cache (`quote_cache_ttl_seconds`), tracked index names resolve too, bad symbols dropped not faked, capped at 100/request. `app/ingestion/quotes.py` + `app/api/routes/quote.py`. 6 offline tests (monkeypatched yfinance), 36/36 suite green; verified live for RELIANCE/TCS/NIFTY 50. Documented in the service README + `/docs/data-sources.md`.

**Backend — main app (Next.js):**
- [x] `alerts` MongoDB collection + data-access — `src/lib/alerts/store.ts` + `types.ts` (userId via existing `currentUserId.ts` split; schema per ADR 0014 §5, incl. `armed`/`cooldownUntil` re-arm gate). `listActiveAlerts()` for the cron, `applyAlertTransition()` for post-cycle writes, `updateAlert()` resets the re-arm gate on edit/reactivate.
- [x] `notifications` MongoDB collection + generic subsystem — `src/lib/notifications/{types,store,channels,deliver}.ts`. `deliverNotification(userId, payload, channels)` always writes the in-app record then fans out; `resolveChannels(userId)` derives email/webhook from env (never gated on `isHosted()`); `kind` field so Phase 7/8 reuse it. Webhook channel fully implemented; email is a clean no-throw seam that reports `skipped` until a provider is provisioned (ADR 0014 open dep).
- [x] Pure evaluators — `src/lib/alerts/evaluators.ts`: `evaluatePriceThreshold` / `evaluatePercentMove` / `evaluate52WeekBreach` / `evaluatePortfolioPnl` (all no-I/O), plus `decideAlertTransition` (one-shot vs re-arm + cooldown + hysteresis) and `snapshotFromQuote`. `tsc`/`eslint` clean. **Unit tests still pending — see the test item below.**
- [x] `src/lib/dashboard/fundamentalsApi.ts` → `getQuotes(symbols[])` client for the new `/quote` endpoint (`cache: 'no-store'`).
- [x] `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/[id]` — Zod-validated (discriminated union on `type`; PATCH validates `params` against the loaded alert's type), session-scoped via `currentUserId.ts`. Supporting: `src/lib/alerts/schemas.ts`, `getAlertById()` in the store. Documented in `/docs/api-surface.md`.
- [x] `GET /api/notifications` (list + `meta.unread`), `POST /api/notifications/read` (`{id}` one / `{}`|`{all:true}` all). Documented.
- [x] `GET|POST /api/cron/evaluate-alerts` — `CRON_SECRET` bearer guard (dev-open, prod-`503` when unset), `?force=1` bypass, `isNseSession()` gate (`src/lib/alerts/marketHours.ts`, `Intl` IST parts, Mon–Fri ~09:15–15:35, deliberately not holiday-aware per ADR 0014), graceful degradation (`skippedNoData` count, never fires on missing data). Loop lives in `src/lib/alerts/evaluate.ts` (batches quotes, computes whole-book + per-holding metrics via `src/lib/alerts/portfolioMetrics.ts`, builds per-type notification copy). Documented. GET because Vercel Cron issues GET.
- [x] Root `vercel.json` cron — intended `*/10 3-10 * * 1-5` but the **Hobby plan rejects sub-daily crons**, so shipped `0 4 * * *` (once daily ≈ 09:30 IST; the route's session gate handles weekends). Real cadence comes from an external scheduler on the `CRON_SECRET`-guarded route (README recipe). ADR 0014 amendment 2026-09-06.
- [x] ~~Email provider provisioned~~ → **deferred to a follow-up** (ADR 0014 amendment 2026-09-06). `discover --category messaging` returns only Resend, which needs a new third-party integration + a verifiable sending domain (`.vercel.app` can't be verified). v1 ships **in-app + webhook**; webhook covers every "notify me elsewhere" case. `sendEmail` in `src/lib/notifications/channels.ts` stays a config-gated no-throw seam — wiring Resend later is `npm install resend` + the seam + a template + one live test, no engine refactor. Tracked below under "Phase 5 follow-ups".

**Frontend:**
- [x] `/dashboard/alerts` route in the app shell — `page.tsx` (server, reads `?new=1&symbol=` for the stock-page hand-off), `AlertsPageClient.tsx` (list grouped by status, create/edit inline, pause/resume/re-activate/delete), `AlertForm.tsx` (type-switched param fields, re-arm + cooldown), `alertText.ts` (pure describe/status helpers), `page.module.css`. "Alerts" added to `AppHeader` nav + `isNavActive`.
- [x] "Set alert" affordance on `/dashboard/stock/[ticker]` — button in the price column → `/dashboard/alerts?new=1&symbol=<sym>`, form opens prefilled.
- [x] Notification bell + dropdown in `AppHeader` (`NotificationBell.tsx` + `.module.css`) — polls `/api/notifications` on mount / every 60s / on window focus, unread badge, click-through marks read + navigates to `href`, "Mark all read". Mounted in both the desktop actions and the mobile header; `MobileTabBar`'s dead "Search" tab swapped for "Alerts".
- [x] Built against `/docs/design-system.md` + the `--app-*` token subset (cards, pills, `linkButton`/`linkButtonDanger`, `formError` all reused from the portfolio page's language). Verified live in selfhost mode via Playwright: empty state, form, created-alert card, and the full create→list→pause→delete API round-trip against real MongoDB; cron `?force=1` ran and degraded gracefully (`skippedNoData`) with fundamentals-api `/quote` not yet deployed.

**Cross-cutting:**
- [x] Works in both deployment modes — `getCurrentUserId()` (`local` in selfhost), email/webhook gated on `RESEND_API_KEY`/`ALERT_WEBHOOK_URL`/`ALERT_EMAIL_TO` config, **not** `isHosted()`; in-app notifications always on. Cron route is `CRON_SECRET`-guarded and outside `proxy.ts`'s auth; README "Alerts evaluation (cron)" section has the self-host `curl` recipe.
- [x] Test runner set up (vitest — repo's first for the Next.js side; `npm test` / `test:watch`, `vitest.config.mts`, node env, `src/**/*.test.ts`). Table-driven unit tests for the pure logic: `evaluators.test.ts` (4 evaluators + `decideAlertTransition` cooldown/hysteresis state machine + `snapshotFromQuote`), `marketHours.test.ts` (IST session incl. UTC-vs-IST calendar-day edge), `portfolioMetrics.test.ts` (whole-book + single-holding, unpriced-holding exclusion). **50 tests green**, `tsc`/`eslint`/`next build` all still clean.
- [x] Remaining test coverage: `evaluate.test.ts` (the `evaluateAlerts()` loop, mocked store/quotes/delivery — fire, no-fire, skippedNoData, portfolio P&L, delivery-failure resilience) + `alerts.route.test.ts` / `notifications.route.test.ts` / `cron.route.test.ts` (handlers called directly with mocked `currentUserId`/store; covers the discriminated-union validation, PATCH type-aware param validation, and the full `CRON_SECRET` guard matrix). **78 tests green** total.
- [x] `/docs/architecture.md` "Alerts engine" section added; README + `.env.local.example` document `CRON_SECRET` / `ALERT_WEBHOOK_URL` / `ALERT_EMAIL_TO` and the self-host cron `curl` recipe.
- [ ] Confirm the phase with the user before running the archiving protocol.

**Phase 5 follow-ups (do not block sign-off):**
- [x] Deployed 2026-09-06: `services/fundamentals-api` redeployed with `/quote` (verified live — real RELIANCE/TCS/NIFTY 50 quotes). `marketmitra-v2` redeployed with `vercel.json`'s daily cron + `CRON_SECRET` set on it (Secret type). Post-deploy prod checks pass: landing 200, `/api/search` regression OK, cron route `401` without token / `{ran:true, errors:0}` with it. `@types/node` bumped `^20→^24` so Vercel's strict `npm install` resolves the vitest/vite peer.
- [~] Real ~10-min cadence: `.github/workflows/evaluate-alerts.yml` written (every 10 min during market hours, hits the `CRON_SECRET`-guarded route). **Activate:** `gh secret set CRON_SECRET` + make this the repo's default branch (GitHub runs `schedule:` only from the default branch; `workflow_dispatch` works from any branch). Or use cron-job.org / a home crontab instead.
- [ ] Email delivery: provision Resend (`vercel integration add resend/resend-email`), wire the `sendEmail` seam against the `resend` SDK, add an alert-email template, one live send test. Needs a from-domain decision (`resend.dev` to start, or a custom domain).
- [ ] Verify one real alert fires end-to-end during NSE market hours (create an alert as a signed-in user, hit the cron route with `?force=1` + token, confirm the notification), then confirm the phase.

**Explicitly out of v1 scope** (ADR 0014): email (deferred, above), browser/Web Push, NSE trading-holiday calendar, SMS, per-user quiet hours, digest/batched notifications, alert history/analytics beyond the notification list.

## Phase 6 — News Feed (stock/company news) 🔄
Scoped 2026-09-06 — see [ADR 0015](./docs/decisions/0015-news-feed-scope.md). v1 = hybrid free sourcing (broad Indian-markets RSS for the global stream + Google News RSS per-symbol for stock/portfolio views), ingestion in `fundamentals-api` with lazy TTL refresh (no new cron), a VADER headline-tone sentiment tag per item, and three UI surfaces. No news notifications in v1 (Phase 5's `deliverNotification` is ready for that as a follow-up).

**Backend — fundamentals-api:**
- [x] Deps: `feedparser` + `vaderSentiment` in `pyproject.toml` + trimmed `requirements.txt`. `news_broad_cache_ttl_minutes` (30) / `news_symbol_cache_ttl_minutes` (60) / `news_retention_days` (30) in `config.py`.
- [x] Migration `31f04c1b3507` — `news_items` (deduped on `url`, `published_at` indexed) + `news_item_symbols` (`symbol` indexed). Hand-written (no local Postgres to autogenerate against). **Still to apply against prod Neon at deploy time.**
- [x] `app/ingestion/news.py` — `fetch_broad_items()` (5 verified feeds: ET/LiveMint/BusinessLine/Moneycontrol/NDTV Profit — Business Standard 403s, dropped), `fetch_symbol_items()` (Google News RSS by company name), `matcher_name()`/`build_name_pattern()`/`tag_symbols()` (word-bounded, multi-word names only), `score_sentiment()` (VADER → 3-way + rounded score), HTML-stripped summaries. All sync work via `asyncio.to_thread`.
- [x] `app/services/news_service.py` — `get_news()` with lazy TTL refresh-on-read (broad + per-symbol), keyset cursor pagination (`_encode_cursor`/`_decode_cursor`), URL-dedup upsert + symbol linking, 30-day prune, name-index built from `company_master`, `refresh_all()` for an optional warm-up cron, `TRACKED_SYMBOLS` curated set.
- [x] `GET /news` (`?symbols=`, `?limit=`, `?cursor=`) → `{ items[], next_cursor }`, registered in `main.py`. **14 offline tests** (RSS fixtures for broad + Google News, name-matching, VADER labelling, cursor round-trip, staleness, route shape/422); fundamentals-api suite 50/50, ruff clean. Live-verified: broad feeds returned ~140 real items, Google-News-per-symbol returned 64 for RELIANCE with real publisher attribution.
- [x] Service README (endpoint list + "News feed" section + coverage-table row, test count 36→50) and `/docs/data-sources.md` (RSS-feeds entry + Google News RSS entry, each with a ToS line) updated.

**Frontend — Next.js:**
- [x] `src/lib/dashboard/newsApi.ts` — `getNews({symbols?, limit?, cursor?})` → `{ items, next_cursor }`, returns an empty page on failure. `GET /api/news` thin proxy for client-side pagination/toggle (documented in `/docs/api-surface.md`).
- [x] `/dashboard/news` — server `page.tsx` (fetches first global page + resolves the user's holding symbols), `NewsFeedClient.tsx` (All markets / My holdings toggle, cursor "Load more", honest empty states), `page.module.css`. Shared `NewsList` + `NewsList.module.css` in `dashboard-charts/` (sentiment dot, source, relative time, links out). "News" added to `AppHeader` nav + `isNavActive`; `MobileTabBar`'s disabled "Profile" tab swapped for "News".
- [x] "Recent news" card on `/dashboard/stock/[ticker]` — `getNews({symbols:[ticker], limit:6})` in the server component, rendered via `NewsList` (only when items exist).
- [x] Built against the design system + `--app-*` tokens; sentiment dot uses `--app-gain` / `--app-text-subtle` / `--app-loss`, page intro + dot `title` label it "headline tone… not analysis, and not a signal". Verified live in selfhost mode (Playwright): global feed renders real items with dots/sources, TCS stock page shows a real 6-item news card.
- [x] `/api/news` thin proxy added (the feed does paginate client-side) — documented in `/docs/api-surface.md`.

**Cross-cutting:**
- [x] Works in both deployment modes — no `isHosted()` gating; `/api/news` is public, the holdings filter uses whatever `getCurrentUserId()` resolves.
- [x] `tsc` / `lint` / `next build` / `npm test` (78) green; fundamentals-api `pytest` 50/50. Live-verified end-to-end against a local Postgres (migration applied) + local fundamentals-api: `/news` global + `?symbols=` + cursor pagination all return real data; the two Next.js surfaces render correctly.
- [x] `/docs/architecture.md` "News feed" section added; `/docs/api-surface.md` gets a `GET /api/news` entry.
- [x] Deployed 2026-09-06: migration `31f04c1b3507` applied to prod Neon (`alembic current` → head); fundamentals-api redeployed — prod `/news` verified serving real data (global + `?symbols=RELIANCE` + cursor). marketmitra-v2 redeployed — prod `/api/news` proxy verified; landing/`/api/search`/`/sign-in` regression-clean. `/dashboard/news` (and every `/dashboard/*`) returns 404 to bare `curl` — that's Clerk's dev-instance `protect-rewrite` for non-browser clients, identical to `/dashboard/portfolio`, not a regression; a real signed-in browser is needed to see the page render in prod.
- [ ] Confirm the phase with the user (ideally after eyeballing `/dashboard/news` signed-in in prod) before archiving.

**Explicitly out of v1 scope** (ADR 0015): notifications on news, LLM sentiment/summarisation, near-duplicate-story dedup across outlets, full article text / reader view, non-English news, user-configurable sources or per-source muting, per-user saved/read state.

## Phase 7 — IPO Tracker + GMP Alerts 🔄
Scoped 2026-09-06 — see [ADR 0017](./docs/decisions/0017-ipo-tracker-gmp-scope.md). v1 = IPO calendar + subscription + **GMP** (scraped from one aggregator, heavily caveated), ingested in `fundamentals-api` with lazy TTL refresh; alerts reuse Phase 5's engine (two new variants: a per-user `ipo_watch` subscription + per-IPO `ipo` alerts) with four triggers (opens / last day / allotment+listing / GMP threshold); a `/dashboard/ipos` page + a dashboard-home widget. The title's "nodemailer" is superseded by ADR 0014 — IPO alerts go through `deliverNotification` (in-app + webhook).

- [x] **GATE — ToS review:** Chittorgarh reviewed 2026-09-06 (terms prohibit content reuse without permission; site 403s bots). **User decision: accept the trade-off** on the same terms as Screener.in — isolated swappable module, GMP caveated + degrades to "unavailable", polite pacing. Recorded in `/docs/data-sources.md` + ADR 0017 amendment.

**Backend — fundamentals-api:**
- [x] Migration `2796fbd6805c` — `ipos` table (slug dedup, `status` indexed, category, 4 dates, price, `ipo_size_cr`, lot, rating, `subscription_times`, anchor, `gmp`/`gmp_pct`/`gmp_low`/`gmp_high`/`gmp_updated_at`, `source_tier`). `ipo_cache_ttl_minutes` (60) / `ipo_listed_retention_days` (30) / `ipo_ingest_token` in `config.py`. Applied locally.
- [x] `app/ingestion/tier3_ipo_scraper/` (scraper + README) — `_parse_ipo_rows(html, ref)` pure parser for InvestorGain's Live-IPO-GMP report table (`<td data-label>`), deriving slug / category / status / GMP+range / rating / sub / price / size / lot / 4 dates (IST year-inference) / anchor. **Verified against a maintainer-saved page: 23 real IPOs, all fields.** `nsepython` has no IPO helpers → Tier 1 is a future direct-call attempt; Tier 3 is the primary. `fetch_ipo_list()` is best-effort (the live page is a SPA — see the live-ingestion job item).
- [x] `app/services/ipo_service.py` — `get_ipos(session, status?)` reads Postgres (ordered open→upcoming→closed→listed) with lazy TTL refresh; `ingest_ipos(session, rows)` upserts on slug + prunes old listings. IST-aware dates.
- [x] `GET /ipos?status=` + `POST /ipos/ingest` (`ipo_ingest_token` bearer, 503 when unset) — registered in `main.py`. 13 offline tests (`tests/test_ipos.py`: parser field-by-field, `_parse_dmon` year-rollover, route shape, 422 on bad status, ingest 503). fundamentals-api suite 63/63, ruff clean. Verified live end-to-end against a local Postgres: ingest 23 → `get_ipos` status filters return correct sets.
- [x] Docs: service README ("IPO tracker" section + endpoint list + coverage row, test count 50→63), `/docs/data-sources.md` (Chittorgarh/InvestorGain entry with the ToS line), `tier3_ipo_scraper/README.md` (ToS position + out-of-band fetch rationale).

**Backend — main app (alerts reuse):**
- [x] Zod variants in `src/lib/alerts/schemas.ts` — `ipo_watch` + `ipo` added to the discriminated union + `paramsSchemaForType`. Types in `types.ts` (`IpoWatchParams`/`IpoAlertParams`/`IpoTrigger`/`IpoSnapshot`, `sentKeys` on `Alert`).
- [x] `store.ts` — `sentKeys` on the doc; `getIpoWatch(userId)` + `upsertIpoWatch(userId, params)` (one-per-user, resets `sentKeys` on edit); `applyAlertTransition` patch accepts `sentKeys`.
- [x] `src/lib/alerts/ipoAlerts.ts` — pure `istToday()` (IST), `evaluateIpoAlert(params, ipo, today)` (date triggers + gmp crossing, null on missing data), `evaluateIpoWatch(params, ipos, sentKeys, today)` (per-(slug,subkey) hits, mainboard filter, sentKeys prune). 15 table tests (`ipoAlerts.test.ts`).
- [x] `evaluateAlerts()` — one `getIpos()` per cycle (only when ipo alerts exist), `ipo_watch` branch (multi-notify + `sentKeys` write) and `ipo` branch (`decideAlertTransition` reused), per-type notification copy (`buildIpoWatchPayload`/`buildIpoAlertPayload`). `iposFetched` in the summary. `src/lib/dashboard/iposApi.ts` client added. Loop tests in `evaluate.test.ts` (+5).
- [x] `POST /api/alerts` special-cases `ipo_watch` → `upsertIpoWatch` (returns 200). New variants documented in `/docs/api-surface.md`. `tsc`/`lint`/`next build`/`npm test` (93) green.

**Frontend — Next.js:**
- [ ] `src/lib/dashboard/iposApi.ts` client + `/api/ipos` thin proxy if the list filters client-side.
- [ ] `/dashboard/ipos` — Open now / Upcoming / Recently listed sections; each row shows dates, price band, lot size, issue size, subscription ×, and **GMP with its "unofficial grey-market estimate, not from any exchange" caveat inline**. Page-header "Notify me about IPOs" control → the `ipo_watch` subscription (trigger checkboxes + mainboard-only). "Set alert" per row → a per-IPO `ipo` alert. "IPOs" added to `AppHeader` nav (not the mobile tab bar — already at 5).
- [ ] "IPOs open now" compact card on `/dashboard` home, linking to the page.
- [ ] Built against the design system + `--app-*` tokens.

**Cross-cutting:**
- [ ] No `isHosted()` gating (IPO data is public). Works in both modes.
- [ ] `tsc` / `lint` / `next build` / `npm test` green; fundamentals-api `pytest` green. Verify live: `/ipos` returns real IPOs + GMP; the page + widget render; one IPO alert fires end-to-end.
- [ ] Update `/docs/architecture.md`; confirm the phase with the user before archiving.

**Explicitly out of v1 scope** (ADR 0017): GMP history/charts, buybacks/rights issues/NFOs, broker- or category-wise subscription breakdown, "apply via broker" links, email delivery, a second GMP source / cross-checking.

## Phase 8 — AI Insights (stock-level + portfolio-level) ❓
Needs a dedicated discussion: which LLM provider(s) for v1, insight scope/format, how trial-limit counting (from the hosted pricing model) actually gets enforced per insight generated.

## Phase 9 — API Surface Formalization + Agent-Context Docs ❓
Needs a dedicated discussion: documentation format (JSON/Markdown response modes as originally requested), testing playground scope, what "agent-context prompts" concretely means as a deliverable. Note: document endpoints incrementally as each phase ships them, not only in this dedicated pass.
- **Also pull in here (or an infra pass):** the hosted shared instance's fair-use **rate limiting** — the landing page now states it exists (ADR 0016) but nothing enforces it. Needs a mechanism (per-user / per-IP, on the `/api/*` routes and/or the fundamentals-api) before the claim is true.

## Phase 10 — AI Chat with RAG ❓
Needs a dedicated discussion: what's actually in the retrieval corpus (news? filings? portfolio data? all three?), which vector store, how it's scoped per-user vs. general market knowledge.

## Phase 11 — Advanced Analytical Agents (TradingAgents-pattern, built in-house) ❓
Needs a dedicated discussion once Phase 8–10 exist to build on. Reminder: this means building our own multi-agent analysis pattern inspired by TauricResearch's architecture — not importing their repo as a dependency.

## Phase 12 — Mobile App (Expo/React Native, hosted-only) ⬜
Full spec already written — see `marketmitra-mobile-app-prompt.md`. Deprioritized relative to the web feature phases above; pick up when there's bandwidth for a parallel track. In-app purchase handling remains an explicit open decision inside that document — resolve before App Store submission, not before starting the build.

---

## Deferred / Held Separately

- **Company legal issues / litigation tracking** — deferred, no data source decided, no ETA. Revisit only when explicitly raised again.
- **NautilusTrader** — not scheduled in any phase above. Requires its own dedicated conversation on scope (backtesting/research-only vs. live trade execution) before any code is written, given the regulatory/liability weight of the live-execution option. Do not fold this into any other phase's work without that conversation happening first.

---

## Standing rules that apply across every phase

- Stack: Next.js + TypeScript, CSS Modules only (no Tailwind/Bootstrap), MongoDB (unless Phase 4's storage discussion changes this for that service specifically), monorepo (`apps/web`, `apps/mobile`, `packages/shared`, and — pending Phase 4 — likely a `services/` directory for backend services like the fundamentals API).
- `DEPLOYMENT_MODE` gate governs all auth/billing code paths — self-host must remain free, full-featured, and BYOK for every phase, not just the ones built so far.
- Scraping (Scrapling/Screener.in or similar) never enters production code, in any phase — dev/test-only, if used at all.
- Any real architectural or product decision made while working a phase gets an ADR — don't let a decision live only in chat history.
