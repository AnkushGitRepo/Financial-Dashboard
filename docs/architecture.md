# Architecture

Current system architecture for MarketMitra v2. Kept in sync with reality — when a feature ships, its detailed build notes move to `/docs/archive/<feature-name>.md` and only a short summary stays here (see the context maintenance protocol in `/CLAUDE.md`).

## Status: Phase 4 in progress — fundamentals data API

v2 is a teardown-and-rebuild of the v1 Financial-Dashboard repo (see [ADR 0001](./decisions/0001-teardown-and-rebuild.md)). Phase 2 scaffold and the deployment-mode gate are both live in production. Phase 3 shipped: landing page, dashboard shell, and on-brand auth pages (see "Shipped features" below). Distribution/pricing model is set ([ADR 0008](./decisions/0008-hosted-vs-self-hosted-distribution.md)), and it's confirmed as a genuinely free, no-paid-tier product for data sourcing too ([ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md)). Code is pushed to the `v2` branch on GitHub (not merged to `main` yet). Phase 4's first build is the fundamentals/screener.in-equivalent data service — see "Fundamentals data service" below.

The repo is now a small monorepo: the Next.js app at the root (`src/`) plus a standalone Python service under `services/fundamentals-api/`. This is the first service under `services/`, anticipated by the standing rules in ROADMAP.md.

## Stack

- **Framework:** Next.js 16, App Router, TypeScript, `src/` directory ([ADR 0002](./decisions/0002-nextjs-app-router.md))
- **Styling:** CSS Modules + `src/styles/tokens.css` design tokens, no CSS framework ([ADR 0003](./decisions/0003-css-modules-no-framework.md))
- **Backend:** Next.js API route handlers under `src/app/api/**/route.ts`, no separate server ([ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md))
- **Auth:** Clerk v7 ([ADR 0005](./decisions/0005-clerk-auth.md))
- **Database:** MongoDB Atlas via native driver, cached connection helper at `src/lib/mongodb.ts` ([ADR 0007](./decisions/0007-mongodb-native-driver.md))
- **Hosting:** Vercel ([ADR 0006](./decisions/0006-vercel-mongodb-atlas-deployment.md))
- **License:** MIT ([ADR 0009](./decisions/0009-mit-license.md))
- **Deployment mode:** `NEXT_PUBLIC_DEPLOYMENT_MODE` (`hosted` | `selfhost`, defaults to `selfhost`) gates Clerk auth and billing UI ([ADR 0010](./decisions/0010-deployment-mode-gate.md))

> **Note (Next.js 16):** the middleware file convention is renamed to `proxy.ts` (`src/proxy.ts` here) — same API, new filename. Clerk v7 ("Core 3") removed `<SignedIn>`/`<SignedOut>`/`<Protect>` in favor of a single `<Show when="signed-in" | "signed-out">` component. Both surprised the scaffold build — noted here so a future session doesn't relitigate them from stale training data.

## Route structure

| Route                        | Purpose                                                    | Auth (hosted mode)                    | Selfhost mode behavior                    |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `/`                          | Landing page — full marketing content, live                 | public                                 | public; pricing/FAQ sections not rendered |
| `/sign-in/[[...sign-in]]`    | Clerk hosted sign-in, on-brand split layout                  | public                                 | redirects to `/dashboard`                  |
| `/sign-up/[[...sign-up]]`    | Clerk hosted sign-up, on-brand split layout                  | public                                 | redirects to `/dashboard`                  |
| `/dashboard`                 | Dashboard home — stats, portfolio chart, indices, movers     | protected, enforced in `src/proxy.ts` | open directly, no login                    |
| `/dashboard/portfolio`       | Holdings, allocation, diversification/drift analysis         | protected                              | open directly                              |
| `/dashboard/markets`         | Index quotes, market breadth, top gainers/losers, search      | protected                              | open directly                              |
| `/dashboard/stock/[ticker]`  | Stock detail — price chart, ratios, financials, shareholding | protected                              | open directly                              |
| `/dashboard/alerts`          | Price & portfolio alerts — list / create / edit / pause      | protected                              | open directly                              |

All `/dashboard*` routes share one layout (`src/app/dashboard/layout.tsx` → `AppShell`) — see "Dashboard app shell" below.

`src/proxy.ts` runs `clerkMiddleware`, protects `/dashboard(.*)`, and redirects unauthenticated visitors to `/sign-in?redirect_url=...` — but only when `isHosted()` is true. In selfhost mode `proxy.ts` passes every request through untouched. Verified end-to-end in production (hosted) and locally in both modes.

**Full design system reference: [`/docs/design-system.md`](./design-system.md)** — colors, type scale, spacing, component patterns, and layout gotchas learned the hard way. Build every new page against that doc, not against whichever page was built most recently.

**Clerk branding note (open item):** hiding the "Secured by Clerk" footer via `elements.footer` is a supported appearance option, not a documented guarantee for every Clerk plan tier — flagged to the user, not yet confirmed against Clerk's current ToS for this account's plan.

## Deployment mode gate (`isHosted()`)

Full detail: [ADR 0010](./decisions/0010-deployment-mode-gate.md). Summary of where the gate is checked, since this is now a load-bearing pattern any new feature needs to respect:

- **`src/lib/deployment-mode.ts`** — the one `isHosted()` helper every other check below calls. Reads `NEXT_PUBLIC_DEPLOYMENT_MODE`, works identically in server and client code.
- **`src/proxy.ts`** — decides whether `clerkMiddleware` route protection runs at all.
- **`src/app/layout.tsx`** — decides whether `<ClerkProvider>` is mounted.
- **`src/app/sign-in/.../page.tsx`, `src/app/sign-up/.../page.tsx`** — redirect to `/dashboard` instead of rendering Clerk widgets when not hosted (required — rendering `<SignIn>`/`<SignUp>` with no `ClerkProvider` mounted throws).
- **`src/components/landing/Navbar.tsx`** — Clerk `<Show>`-based CTA only in hosted mode; plain `/dashboard` link otherwise. Drops the `#faq` nav link in selfhost mode.
- **`src/components/dashboard/Sidebar.tsx` + `HostedUserFooter.tsx`** — Clerk's `useUser()`/`<UserButton>` are isolated in `HostedUserFooter`, mounted only in hosted mode, so the hook is never called without a `ClerkProvider` in the tree. Selfhost mode shows a static "Local user" label.
- **`src/app/page.tsx`** — `PricingCards` and `FAQAccordion` don't render at all in selfhost mode (not CSS-hidden — absent from the response).
- **`src/components/landing/Footer.tsx`** — drops `#pricing`/`#faq` links in selfhost mode to avoid dead anchors.

**Production requirement:** the live `marketmitra-v2.vercel.app` deployment has `NEXT_PUBLIC_DEPLOYMENT_MODE=hosted` set in its Vercel environment variables — confirmed by the user 2026-09-04.

Self-host auth is intentionally left as "no login, single local user" for now — see ADR 0010's consequences section. This is a placeholder, not a final decision on self-host auth.

**Dev-mode gotcha:** changing `DEPLOYMENT_MODE` in `.env.local` while `npm run dev` is already running is not safely hot-reloadable. Next reloads the env for the server immediately, but Fast Refresh can hot-swap client components (`AppHeader`/`Navbar`) into the browser's already-mounted React tree before the root layout has re-rendered `<ClerkProvider>` to match — briefly calling `useUser()` with no provider in the tree and crashing. Confirmed the server itself is always consistent (a genuinely fresh request after switching renders correctly); the fix is to fully restart `npm run dev` (or hard-reload the browser) after changing `DEPLOYMENT_MODE`, not rely on hot reload.

## Dashboard app shell (`/dashboard*`)

Full visual design imported from an approved Claude Design project ("MarketMitra App", 2026-09-05) and implemented natively — fonts swapped to the project's own (Manrope/JetBrains Mono replacing the design's Bricolage Grotesque/Instrument Sans/IBM Plex Mono) per explicit instruction; layout, colors, and interactions otherwise match the approved design. Replaces the earlier sidebar-based empty-state shell from Phase 3 (`Sidebar.tsx` — deleted, not archived-and-kept, since nothing referenced its layout anymore).

- **Shell:** `src/components/appshell/AppShell.tsx` wraps every `/dashboard*` route (via `src/app/dashboard/layout.tsx`) with `AppHeader` (desktop top nav + mobile compact header, search, mask toggle, user badge), `AiWidget` (floating "Mitra" assistant), and `MobileTabBar` (bottom tab bar, mobile only). Real Next.js routes per page (`/dashboard`, `/dashboard/portfolio`, `/dashboard/markets`, `/dashboard/stock/[ticker]`) — not the original design's client-state single-page switcher — so the browser back button and bookmarks work correctly.
- **Auth gate reused, not reinvented:** `src/components/appshell/HostedUserBadge.tsx` mirrors the deleted `HostedUserFooter`'s pattern (ADR 0010) — Clerk's `<UserButton showName />` only mounts in hosted mode; selfhost mode shows a static "Local user" badge instead.
- **Shared pieces:** `src/components/dashboard-charts/` (`LineChart`, `PillTabs`, `IndexCard`, `MoverPanel` — reused across 2–3 pages each) and `src/lib/dashboard/` (`fundamentalsApi.ts`, `transforms.ts`, `quotes.ts`, `portfolioHistory.ts`, `enrichedHoldings.ts`, `watchlist.ts`, `chartMath.ts`, `format.ts`, `MaskContext.tsx` for the ₹-mask-toggle state shared across pages; `aiWidgetContent.ts` holds the AI widget's scripted demo content specifically — see below).
- **Color tokens:** a second, app-specific token subset in `src/styles/tokens.css` (`--app-*`, e.g. `--app-teal`, `--app-bg-mid`) — distinct from the marketing landing page's `--color-mint*` tokens since this is a denser, teal-accented product surface reviewed and approved separately. Fonts stay shared (`--font-sans`/`--font-mono`) per the design system's typography rule.
- **Real data, end to end** (2026-09-05, [ADR 0012](./decisions/0012-portfolio-holdings-and-real-data-wiring.md)) — no mock data anywhere in this surface (`mockData.ts` deleted):
  - **Stock detail** (`/dashboard/stock/[ticker]`): a Server Component (`page.tsx`) fetches company/ratios/shareholding/financials/prices from fundamentals-api for the real symbol in the URL, pivots/downsamples them (`transforms.ts`), and hands them to a client component (`StockPageClient.tsx`) for range/statement-tab interactivity. Real for any NSE symbol the service recognizes. Also fetches peer comparison and annual-report documents (both new, 2026-09-05) and renders the company's real About text — see fundamentals-api's own coverage table for the peer-comparison caveat (a lazy-loading edge case on Screener's end for some large caps).
  - **Markets/Dashboard indices & movers**: real Indian indices (NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX) via a new fundamentals-api `GET /indices` endpoint; "top gainers/losers" are real day-change quotes computed from a fixed 10-symbol watchlist (`watchlist.ts`), explicitly labeled "(watchlist)" since there's no market-wide screener data source.
  - **Portfolio**: a genuinely new feature — `holdings` MongoDB collection + `/api/holdings` CRUD routes (`src/lib/holdings.ts`, `src/lib/currentUserId.ts` for the hosted/selfhost user-id split) + an add/edit/delete UI. Live LTP/sector per holding comes from fundamentals-api (`enrichedHoldings.ts`). Historical portfolio value is a real-data approximation (`portfolioHistory.ts`: current quantities applied to real historical prices, not a true transaction ledger — captioned as such in the UI). **Verified live end-to-end** (2026-09-05, after the user opened MongoDB Atlas's IP allowlist): add/edit/delete all confirmed working against the real database, not just built.
  - **Dropped, not faked:** diversification score, target progress, sector-vs-benchmark, and drift-from-target had no real data/config source (their mock numbers were hardcoded constants even in the source design) — removed rather than kept as decoration. See ADR 0012 for what replaced them.
- **Still scripted, out of scope for this pass:** the "Mitra" AI widget's insights/replies (`aiWidgetContent.ts`) remain demo content — real AI-generated insights are Phase 8 territory, a separate not-yet-scoped phase.
- **Company logos, real fallback** (`src/components/dashboard-charts/CompanyLogo.tsx`) — every avatar spot (movers, holdings table, stock detail header, search results) renders a real per-symbol logo from a community-maintained open directory (`dharunashokkumar.github.io/indian-listed-company-logos`, itself sourced from TradingView's per-symbol icons), falling back to text initials only on a genuine load failure — confirmed the directory 404s for real for unlisted tickers, so the fallback path is real, not decorative.
- **Search across the whole NSE universe, not just the watchlist** — both the Markets page search and the header search hit a new fundamentals-api `GET /search?q=` (company name/symbol prefix match across ~2,570 real NSE-listed equities, sourced from NSE's own `archives.nseindia.com` equity list — reachable even though `www.nseindia.com` is blocked, see ADR 0011 — plus the four tracked indices). Consumed via a thin same-origin Next.js proxy (`/api/search`) so the browser can call it live-as-you-type without CORS setup on the Python service. See ADR 0012's amendment section for the full detail.

## Alerts engine (`/dashboard/alerts`, Phase 5 — in progress, not yet approved)

Full rationale: [ADR 0014](./decisions/0014-alerts-engine-scope.md). Price / percent-move / 52-week-breach / portfolio-P&L alerts, evaluated on a schedule, delivered through a generic notification subsystem (in-app always; email + webhook when configured). Built but not yet phase-approved; email transport is a stub pending provider provisioning.

- **Data (MongoDB, main app DB):** `alerts` and `notifications` collections. `src/lib/alerts/store.ts` and `src/lib/notifications/store.ts` mirror `holdings.ts`'s pattern; `userId` via the same `currentUserId.ts` hosted/`"local"` split.
- **Pure logic (unit-tested, no I/O):** `src/lib/alerts/evaluators.ts` — one evaluator per type + `decideAlertTransition` (one-shot vs re-arm, cooldown, hysteresis via `armed`/`cooldownUntil` on the alert doc). `src/lib/alerts/marketHours.ts` (`isNseSession`, IST via `Intl`, not holiday-aware by design). `src/lib/alerts/portfolioMetrics.ts`.
- **The cycle:** `src/lib/alerts/evaluate.ts` — load active alerts → collect symbols (incl. portfolio-alert users' holdings) → one batched `GET /quote` to fundamentals-api → evaluate → `applyAlertTransition` → `deliverNotification` for fires. Degrades gracefully: a symbol with no live quote is skipped, never fired on.
- **Delivery:** `src/lib/notifications/deliver.ts` `deliverNotification(userId, payload, channels)` — always writes the in-app record, then fans out. `resolveChannels()` reads `ALERT_WEBHOOK_URL` / `ALERT_EMAIL_TO` / Clerk email, **not** gated on `isHosted()`. **v1 external channel is webhook** (fully implemented); `sendEmail` is a no-throw seam (`status: 'skipped'`) — email deferred to a follow-up (ADR 0014 amendment: only Resend is available and it needs a new integration + verifiable domain).
- **Schedule:** `GET|POST /api/cron/evaluate-alerts`, guarded by a `CRON_SECRET` bearer token (dev-open, prod-503 when unset), `?force=1` to bypass the hours gate. Not behind `proxy.ts` auth. Root `vercel.json` declares a **once-daily** cron (`0 4 * * *`) — the Hobby plan's ceiling (ADR 0014 amendment 2026-09-06); real ~10-min cadence comes from an external scheduler hitting the same URL (README recipe). Verified live in production post-deploy.
- **API:** `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/[id]`, `GET /api/notifications`, `POST /api/notifications/read` — all in `/docs/api-surface.md`.
- **UI:** `/dashboard/alerts` (`AlertsPageClient` + `AlertForm` + `alertText.ts`), a `NotificationBell` in `AppHeader` (desktop + mobile, 60s poll + focus refetch), an "Alerts" nav item + mobile tab, and a "Set alert" button on the stock page that deep-links `?new=1&symbol=`.
- **Tests:** `vitest` (repo's first for the Next.js side — `npm test`, `vitest.config.mts`). 78 tests: the pure evaluators/market-hours/portfolio-maths, the `evaluateAlerts` loop (mocked quote/delivery/store), and the alerts/notifications/cron route handlers.

## News feed (`/dashboard/news`, Phase 6 — in progress, not yet approved)

Full rationale: [ADR 0015](./decisions/0015-news-feed-scope.md). Free RSS
only, ingested in `fundamentals-api`, three surfaces.

- **Ingestion (`fundamentals-api`):** `app/ingestion/news.py` — 4 broad
  Indian-markets RSS feeds (ET / LiveMint / BusinessLine / Moneycontrol;
  Business Standard 403s, NDTV Profit too noisy — both dropped on
  evidence) for the global stream, and Google News RSS one-query-per-
  company-name for stock/portfolio views (exact symbol tag). Broad items
  are tagged best-effort — only a company's distinctive multi-word name,
  whole and word-bounded (`matcher_name` rejects short/single-word names).
  VADER **headline-tone** label per item (stored; labelled everywhere as
  tone, not a signal — generic-lexicon sentiment skews optimistic on
  financial text). Title + summary + link only; no article bodies.
- **Storage / serving (`fundamentals-api`):** Postgres `news_items`
  (deduped on `url`) + `news_item_symbols` (migration `31f04c1b3507`).
  `app/services/news_service.py` does lazy TTL refresh-on-read (same
  pattern as ratios/prices), URL-dedup upsert, 30-day retention prune,
  keyset cursor pagination. `GET /news?symbols=&limit=&cursor=` →
  `{ items[], next_cursor }`.
- **Next.js:** `src/lib/dashboard/newsApi.ts` (client) + `GET /api/news`
  (thin same-origin proxy for client-side pagination/toggle, like
  `/api/search`). `/dashboard/news` — server page resolves the user's
  holding symbols + first global page; `NewsFeedClient` handles the
  "All markets / My holdings" toggle and "Load more". Shared `NewsList`
  (`components/dashboard-charts/`) renders items with a sentiment dot;
  also used for the "Recent news" card on `/dashboard/stock/[ticker]`.
  "News" is in the app-shell nav (desktop) and replaced the disabled
  "Profile" tab on mobile.
- **Deployment mode:** no `isHosted()` gating — news is public; the
  holdings filter just uses whatever `getCurrentUserId()` resolves.
- **Tests:** 14 offline (`test_news.py`) in fundamentals-api; the Next.js
  side verified live against a local Postgres.
- **Not yet done:** migration applied to prod Neon, fundamentals-api
  redeployed with `/news`, live prod verification, phase sign-off.

## Data flow

The dashboard app shell (above) now calls `services/fundamentals-api` directly from Next.js Server Components (`FUNDAMENTALS_API_URL`, server-to-server — not proxied through a `/api/*` route, since it's an existing documented service being consumed, not a new one) for all company/index data, and MongoDB directly (via `src/lib/holdings.ts`, also exposed through `/api/holdings` for client-side mutations) for portfolio holdings. The `DashboardPreview` on the landing page is still static mock data for illustration only — that's marketing-page content, not the logged-in app.

## Fundamentals data service (`services/fundamentals-api/`)

Full detail: [ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md). A standalone Python/FastAPI service — a scoped, deliberate exception to [ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md)'s "no separate server" rule, justified by Python-only tooling (`nsepython`, `bsedata`, `pdfplumber`/`camelot`, `scrapling`) with no practical TypeScript equivalent. Serves screener.in-style data — ratios, historical financial statements, shareholding pattern, documents, price history — for the future stock detail page.

- **Stack:** FastAPI (async), PostgreSQL via SQLAlchemy async + asyncpg (Alembic migrations), pydantic v2, polars, httpx, orjson. Postgres here, not MongoDB — this service's data is naturally tabular/relational, a deliberate per-service exception (ADR 0011), not a project-wide database change.
- **Three-tier free-data fallback chain** (`app/ingestion/`), tried per-field, not per-data-type:
  1. Tier 1 — `nsepython`/`bsedata` (NSE/BSE quotes, corporate actions, IPO data), a direct call to NSE's `/api/corporates-holdings` for shareholding, XBRL parsing (`xbrl_parser.py`) and PDF table extraction (`pdf_financials.py`) for financial statements.
  2. Tier 2 — `yfinance`, for price history and quote-field gaps.
  3. Tier 3 — Scrapling against Screener.in, isolated in `app/ingestion/tier3_screener_scrapling/` with its own README — last resort, mainly for named ratios Tiers 1–2 don't expose.
  - `app/ingestion/orchestrator.py` drives the fallback; every stored/served record carries a `source_tier` field.
- **Indices** (`app/ingestion/indices.py`, `GET /indices`) — real Indian market indices (NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX) via yfinance, served live on each request rather than persisted (see ADR 0012). Not part of the per-company fallback chain above — indices aren't companies.
- **Known, load-bearing limitation:** NSE's site blocks non-browser/non-Indian traffic at the Akamai edge — confirmed during development (a 403 on a plain homepage GET, from this project's own dev environment). `bsedata`, `yfinance`, and Screener.in access all worked live from the same blocked environment. This is exactly why Tiers 2–3 exist as real fallbacks, not formalities — see ADR 0011's "accepted ToS trade-off" section.
- **Real gap, tracked not hidden:** financial-statement serving currently runs through Tier 3 only in practice. Tier 1's XBRL/PDF extraction is implemented and unit-tested against fixtures, but needs a filing-URL discovery step (find a company's latest quarterly XBRL / annual report PDF) that hasn't been built — see ROADMAP.md's Phase 4 checklist.
- **Testing:** all 25 tests run offline (no network, no DB) against saved fixtures — a real Screener.in page saved to disk by the project maintainer (two different companies' pages agree on the same selectors), a synthetic-but-taxonomy-accurate XBRL fixture, and a generated PDF with a ruled table.
- Full setup/run/test instructions and a plain-language coverage table: [`services/fundamentals-api/README.md`](../services/fundamentals-api/README.md).
- **Hosted in production** (2026-09-05): Vercel Python serverless function + Neon Postgres marketplace integration, both inside the existing Vercel account — see [ADR 0013](./decisions/0013-fundamentals-api-vercel-hosting.md). Live at `https://marketmitra-fundamentals-api.vercel.app`. The deployed function uses a separate, trimmed `requirements.txt` (not `pyproject.toml`'s full dependency set) and fetches Tier 3 via `httpx` + `scrapling.parser.Selector` directly rather than `scrapling.fetchers.Fetcher`, whose import chain pulls in a ~130MB Playwright driver the function doesn't need or use.

## Shipped features (see `/docs/archive/` for detail)

- **Landing page (`/`)** — full marketing site built from an approved design export, 10 components in `src/components/landing/`. Full detail: [`/docs/archive/landing-page.md`](./archive/landing-page.md).
- **Dashboard shell (`/dashboard`), Phase 3 version — superseded 2026-09-05** by the full dashboard app shell described above (sidebar-nav empty-state layout replaced entirely, `Sidebar.tsx` deleted). Original build detail (now historical): [`/docs/archive/dashboard-shell.md`](./archive/dashboard-shell.md).
- **Auth pages (`/sign-in`, `/sign-up`)** — on-brand split layout replacing default Clerk widgets, `src/components/auth/`. Full detail (including 3 real Clerk-styling bugs and how they were found): [`/docs/archive/auth-pages.md`](./archive/auth-pages.md).
