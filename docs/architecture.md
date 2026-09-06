# Architecture

Current system architecture for MarketMitra v2. Kept in sync with reality — when a feature
ships and is signed off, its detailed build notes move to `/docs/archive/<feature-name>.md`
and only a short summary stays here (see the context maintenance protocol in `/CLAUDE.md`).

## Status: Phases 0–8 signed off — Phase 9 in progress

v2 is a teardown-and-rebuild of the v1 Financial-Dashboard repo ([ADR 0001](./decisions/0001-teardown-and-rebuild.md)).
All feature phases through Phase 8 are built, deployed to production, and signed off
(2026-09-06). `v2` was merged to `main` on 2026-09-06 so the GitHub Actions cron
schedulers can fire; both branches are currently identical. **Phase 9 (API surface —
MCP server / rate limiting / API explorer, [ADR 0019](./decisions/0019-phase-9-api-surface-mcp-rate-limiting.md))
is underway** — the MCP server (`/api/mcp`) is built and tested; rate limiting and the
explorer page are next.

- **Phase 2–3:** scaffold + deployment-mode gate, landing page, on-brand auth pages,
  dashboard shell. ([archive: landing-page, auth-pages, dashboard-shell](./archive/))
- **Phase 4:** fundamentals data service (`services/fundamentals-api/`) + the real-data
  dashboard (`/dashboard`, `/portfolio`, `/markets`, `/stock/[ticker]`). ([archive](./archive/fundamentals-data-service.md))
- **Phase 5:** alerts engine (`/dashboard/alerts`) + generic notification subsystem. ([archive](./archive/alerts-engine.md))
- **Phase 6:** news feed (`/dashboard/news`). ([archive](./archive/news-feed.md))
- **Phase 7:** IPO tracker + GMP (`/dashboard/ipos`). ([archive](./archive/ipo-tracker.md))
- **Phase 8:** AI insights + Mitra chat (`/dashboard/settings` + insight cards + chat). ([archive](./archive/ai-insights.md))

The repo is a small monorepo: the Next.js app at the root (`src/`) plus a standalone Python
service under `services/fundamentals-api/`.

**Open follow-ups carried past sign-off** (tracked in ROADMAP.md, not blockers):
Tier 1 filing-URL discovery for financial statements; activating the two GitHub Actions
schedulers (alert eval, IPO refresh); Resend email delivery; one real alert fire + one real
IPO-alert fire in market hours; DRHP grounding for IPO briefs; replacing the scripted
"Proactive insight" chat tiles; the hosted-instance fair-use rate limiting the landing page
claims (Phase 9).

## Stack

- **Framework:** Next.js 16, App Router, TypeScript, `src/` directory ([ADR 0002](./decisions/0002-nextjs-app-router.md))
- **Styling:** CSS Modules + `src/styles/tokens.css` design tokens, no CSS framework ([ADR 0003](./decisions/0003-css-modules-no-framework.md))
- **Backend:** Next.js API route handlers under `src/app/api/**/route.ts` ([ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md)); one scoped exception — the Python `services/fundamentals-api/` ([ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md))
- **Auth:** Clerk v7 ([ADR 0005](./decisions/0005-clerk-auth.md))
- **Database:** MongoDB Atlas via native driver, cached connection helper at `src/lib/mongodb.ts` with a 5 s `serverSelectionTimeoutMS` so an unreachable cluster fails fast ([ADR 0007](./decisions/0007-mongodb-native-driver.md)). `services/fundamentals-api/` uses Postgres (Neon) — a per-service exception ([ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md))
- **Hosting:** Vercel — both projects deploy via the Vercel CLI (`vercel deploy --prod --yes`) ([ADR 0006](./decisions/0006-vercel-mongodb-atlas-deployment.md), [ADR 0013](./decisions/0013-fundamentals-api-vercel-hosting.md))
- **License:** MIT ([ADR 0009](./decisions/0009-mit-license.md))
- **Deployment mode:** `NEXT_PUBLIC_DEPLOYMENT_MODE` (`hosted` | `selfhost`, defaults to `selfhost`) gates Clerk auth and the marketing-only landing sections. **Not** a billing switch — MarketMitra has no paid tier ([ADR 0010](./decisions/0010-deployment-mode-gate.md), [ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md), [ADR 0016](./decisions/0016-landing-page-no-paid-tier-reconciliation.md))

> **Note (Next.js 16 / Clerk v7):** the middleware file convention is renamed to `proxy.ts`
> (`src/proxy.ts` here) — same API, new filename. Clerk v7 ("Core 3") removed
> `<SignedIn>`/`<SignedOut>`/`<Protect>` in favor of `<Show when="signed-in" | "signed-out">`.
> Both surprised the scaffold build — noted so a future session doesn't relitigate them from
> stale training data.

## Route structure

| Route                        | Purpose                                                       | Auth (hosted)                         | Selfhost behavior                          |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `/`                          | Landing page — full marketing content                        | public                                | public; pricing/FAQ sections not rendered |
| `/sign-in/[[...sign-in]]`    | Clerk hosted sign-in, on-brand split layout                  | public                                | redirects to `/dashboard`                  |
| `/sign-up/[[...sign-up]]`    | Clerk hosted sign-up, on-brand split layout                  | public                                | redirects to `/dashboard`                  |
| `/dashboard`                 | Dashboard home — stats, portfolio chart, indices, movers, open IPOs | protected in `src/proxy.ts`    | open directly, no login                    |
| `/dashboard/portfolio`       | Holdings, allocation, concentration, per-holding P&L, AI insight | protected                          | open directly                              |
| `/dashboard/markets`         | Index quotes, watchlist gainers/losers, search               | protected                              | open directly                              |
| `/dashboard/stock/[ticker]`  | Stock detail — price chart, ratios, financials, shareholding, peers, About, docs, news, AI read | protected     | open directly                              |
| `/dashboard/alerts`          | Price / %-move / 52w / portfolio-P&L alerts + IPO alerts     | protected                              | open directly                              |
| `/dashboard/news`            | News feed — global stream + "My holdings" toggle             | protected                              | open directly                              |
| `/dashboard/ipos`            | IPO tracker — calendar, subscription, GMP, per-IPO alerts    | protected                              | open directly                              |
| `/dashboard/settings`        | BYO AI provider key (encrypted at rest)                      | protected                              | open directly                              |

All `/dashboard*` routes share one layout (`src/app/dashboard/layout.tsx` → `AppShell`).

`src/proxy.ts` runs `clerkMiddleware`, protects `/dashboard(.*)`, and redirects
unauthenticated visitors to `/sign-in?redirect_url=...` — **only when `isHosted()`**. In
selfhost mode it passes every request through untouched. Verified end-to-end in production
(hosted) and locally in both modes.

**Full design system reference: [`/docs/design-system.md`](./design-system.md)** — build
every new page against that doc, not against whichever page was built most recently. The
dashboard surface uses an app-specific `--app-*` token subset in `src/styles/tokens.css`,
distinct from the marketing landing page's `--color-mint*` tokens; fonts stay shared.

**Clerk branding note (open item):** hiding "Secured by Clerk" via `elements.footer` is a
supported appearance option, not a documented guarantee for every plan tier. Production
still runs on a Clerk **dev instance** (`touched-perch-1357.clerk.accounts.dev`) —
pre-existing and tracked; a consequence is that bare `curl` of any `/dashboard/*` or `/`
sees a dev-instance handshake/rewrite that only a real browser completes.

## Deployment mode gate (`isHosted()`)

Full detail: [ADR 0010](./decisions/0010-deployment-mode-gate.md). Load-bearing pattern
every new feature must respect. Where the gate is checked:

- **`src/lib/deployment-mode.ts`** — the one `isHosted()` helper; reads
  `NEXT_PUBLIC_DEPLOYMENT_MODE`, works in server and client code.
- **`src/proxy.ts`** — whether `clerkMiddleware` route protection runs at all.
- **`src/app/layout.tsx`** — whether `<ClerkProvider>` is mounted.
- **`src/app/sign-in/.../page.tsx`, `sign-up/.../page.tsx`** — redirect to `/dashboard`
  instead of rendering Clerk widgets when not hosted (rendering them with no `ClerkProvider`
  throws).
- **`src/components/appshell/HostedUserBadge.tsx`** — Clerk's `<UserButton>` mounts only in
  hosted mode; selfhost shows a static "Local user" badge. (The Phase 3 landing/sidebar
  equivalents — `Navbar.tsx`, `HostedUserFooter.tsx` — follow the same pattern.)
- **`src/app/page.tsx` + `Footer.tsx`** — `PricingCards` / `FAQAccordion` and their nav
  anchors are *absent* from the selfhost response, not CSS-hidden.
- **Feature backends** (alerts, news, IPO, AI) are **not** gated on `isHosted()` — they gate
  on their own config env vars. Self-host stays fully featured. The one AI nuance: per-user
  AI surfaces use the deployment `AI_*` env key only when `!isHosted()` (single local user);
  hosted per-user surfaces never fall back to an operator key.

**Production requirement:** `marketmitra-v2.vercel.app` has `NEXT_PUBLIC_DEPLOYMENT_MODE=hosted`
set — confirmed by the user 2026-09-04.

**Dev-mode gotcha:** changing `DEPLOYMENT_MODE` in `.env.local` while `npm run dev` is
running is not safely hot-reloadable (Fast Refresh can hot-swap a client component into the
tree before the root layout re-renders `<ClerkProvider>`, briefly calling `useUser()` with
no provider). Fully restart `npm run dev` after changing it.

## Dashboard app shell (`/dashboard*`)

Visual design imported from an approved Claude Design project ("MarketMitra App", 2026-09-05),
implemented natively with fonts swapped to Manrope / JetBrains Mono. Replaced the Phase 3
sidebar-based empty-state shell entirely (`Sidebar.tsx` deleted).

- **Shell:** `src/components/appshell/AppShell.tsx` wraps every `/dashboard*` route with
  `AppHeader` (desktop top nav + mobile compact header, search, ₹-mask toggle, user badge),
  `AiWidget` (floating "Mitra" assistant), and `MobileTabBar`. Real Next.js routes per page
  — not the design's client-state single-page switcher — so back/bookmarks work.
- **Shared pieces:** `src/components/dashboard-charts/` (`LineChart`, `PillTabs`, `IndexCard`,
  `MoverPanel`, `CompanyLogo`, `NewsList`, `InsightCard`, `IpoOpenCard`) and
  `src/lib/dashboard/` (`fundamentalsApi.ts`, `newsApi.ts`, `iposApi.ts`, `transforms.ts`,
  `quotes.ts`, `portfolioHistory.ts`, `enrichedHoldings.ts`, `watchlist.ts`, `chartMath.ts`,
  `format.ts`, `MaskContext.tsx`, `aiWidgetContent.ts`).
- **Real data, end to end** ([ADR 0012](./decisions/0012-portfolio-holdings-and-real-data-wiring.md))
  — no mock data anywhere in this surface. Stock detail, markets/indices, portfolio holdings
  (a genuinely new feature — `holdings` collection + `/api/holdings` CRUD), NSE-universe
  search, company logos, news cards, and AI insight cards are all live. Build detail,
  gotchas, and what was *dropped rather than faked*: [archive/fundamentals-data-service.md](./archive/fundamentals-data-service.md).
- The landing page's `DashboardPreview` is still static mock data — marketing content, not
  the logged-in app.

## Fundamentals data service (`services/fundamentals-api/`)

Full detail: [archive/fundamentals-data-service.md](./archive/fundamentals-data-service.md);
decisions in [ADR 0011](./decisions/0011-three-tier-fundamentals-data-sourcing.md) /
[ADR 0013](./decisions/0013-fundamentals-api-vercel-hosting.md); run/test instructions +
plain-language coverage table in [`services/fundamentals-api/README.md`](../services/fundamentals-api/README.md).

- **Stack:** FastAPI (async), PostgreSQL via SQLAlchemy async + asyncpg (Alembic), pydantic
  v2, polars, httpx, orjson. Postgres not MongoDB — tabular data, a deliberate per-service
  exception.
- **Three-tier free-data fallback chain**, tried per-field: Tier 1 `nsepython`/`bsedata` +
  XBRL/PDF parsing → Tier 2 `yfinance` → Tier 3 Scrapling against Screener.in (isolated
  module). Every record carries `source_tier`. **NSE blocks non-browser/non-Indian traffic
  at the Akamai edge** — confirmed in dev; this is *why* Tiers 2–3 are real fallbacks.
- **Endpoints:** company / ratios / shareholding / financials / prices / documents / peers /
  `GET /indices` / `GET /search?q=` (~2,570 NSE equities) / `GET /quote?symbols=` (batched
  live quote) / `GET /news` / `GET /ipos` + `POST /ipos/ingest`. All in
  [`/docs/api-surface.md`](./api-surface.md).
- **Hosted in production:** Vercel Python serverless function + Neon Postgres. Live at
  `https://marketmitra-fundamentals-api.vercel.app`; the deployed function uses a trimmed
  `requirements.txt` and avoids `scrapling.fetchers.Fetcher` (pulls a ~130 MB Playwright
  driver it never uses).
- **Known gap (tracked):** financial-statement serving runs through Tier 3 only in practice —
  Tier 1's XBRL/PDF extraction is built and fixture-tested but has no filing-URL discovery
  step feeding it.

## Alerts engine (`/dashboard/alerts`)

Full detail: [archive/alerts-engine.md](./archive/alerts-engine.md); rationale in
[ADR 0014](./decisions/0014-alerts-engine-scope.md).

Four trigger types (price threshold, percent move, 52-week breach, portfolio P&L), evaluated
on a schedule, delivered through a **generic notification subsystem** (`src/lib/notifications/`)
— in-app always, email + webhook when configured, `resolveChannels()` gated on config env
vars not `isHosted()`. `alerts` + `notifications` MongoDB collections. Pure evaluators +
`decideAlertTransition` (one-shot vs re-arm, cooldown, hysteresis) in `src/lib/alerts/`,
unit-tested with no I/O. The cycle (`evaluate.ts`) batches one `GET /quote`, degrades
gracefully on missing data (`skippedNoData`, never fires). `GET|POST /api/cron/evaluate-alerts`
is `CRON_SECRET`-guarded; `vercel.json` declares a once-daily cron (Hobby ceiling), real
~10-min cadence needs an external scheduler. UI: `/dashboard/alerts` + a `NotificationBell`
in `AppHeader`. The IPO tracker (Phase 7) reuses this engine — see below. **Email transport
is a config-gated no-throw stub** pending Resend provisioning.

## News feed (`/dashboard/news`)

Full detail: [archive/news-feed.md](./archive/news-feed.md); rationale in
[ADR 0015](./decisions/0015-news-feed-scope.md).

Free RSS only, ingested in `fundamentals-api` with **lazy TTL refresh-on-read** (no cron).
Global stream = 4 broad Indian-markets RSS feeds; stock/portfolio views = Google News RSS
per company name (exact symbol tag). Postgres `news_items` (URL-deduped) + `news_item_symbols`
(migration `31f04c1b3507`), 30-day retention, keyset cursor pagination. Each item carries a
VADER **headline-tone** label — shown everywhere as tone, *not a signal*. `GET /news` +
`GET /api/news` (thin proxy). Surfaces: `/dashboard/news` (with an "All markets / My
holdings" toggle) and a "Recent news" card on the stock page, both via a shared `NewsList`.
No `isHosted()` gating. No news notifications in v1 (the subsystem is ready for them).

## IPO tracker + GMP (`/dashboard/ipos`)

Full detail: [archive/ipo-tracker.md](./archive/ipo-tracker.md); rationale in
[ADR 0017](./decisions/0017-ipo-tracker-gmp-scope.md).

IPO calendar + subscription + **grey-market premium** (scraped from InvestorGain's "Live IPO
GMP" report, heavily caveated as an unofficial estimate, degrades to "unavailable"; ToS
accepted on the same terms as the Screener scraper). Postgres `ipos` table (migration
`2796fbd6805c`), lazy TTL refresh, update-first upsert on slug, 10-day post-listing prune.
**Fetch is out of band** — the report is a client-rendered SPA, so
`scripts/refresh_ipos.py` renders it with Playwright Chromium and `POST`s to `/ipos/ingest`
(`IPO_INGEST_TOKEN` bearer); the serverless `GET /ipos` only reads Postgres. Alerts **reuse
Phase 5's engine** — `ipo_watch` (one per user) + per-IPO `ipo` variants in the same
`alerts` collection / `evaluateAlerts()` loop, four triggers (opens / last day /
allotment+listing / GMP threshold), pure logic in `src/lib/alerts/ipoAlerts.ts`. UI:
`/dashboard/ipos` (`IposPageClient` + `IpoRow`) + an `IpoOpenCard` on the dashboard home.
Prod seeded with 39 real IPOs; the GH Actions refresh is inert until its secret + default
branch are set.

## AI Insights + Mitra chat (`/dashboard/settings`, insight cards, chat)

Full detail: [archive/ai-insights.md](./archive/ai-insights.md); rationale in
[ADR 0018](./decisions/0018-ai-insights-scope.md).

Neutral AI synthesis on four surfaces (stock read, portfolio insight, IPO brief, Mitra
chat), all **BYO-key** — no MarketMitra-supplied model access. **AI SDK v7** with three
direct adapters (`@ai-sdk/google`, `@ai-sdk/anthropic`, `@openrouter/ai-sdk-provider` — not
the shared-key AI Gateway). Key stored **AES-256-GCM encrypted** in the `userSettings`
collection (`src/lib/crypto.ts`, `SETTINGS_ENC_KEY`), decrypted only server-side.
`getAiConfig(userId, {allowEnv})` resolves: stored key ▸ `AI_*` env **only when
`!isHosted()`** ▸ null; a cold-start DB error degrades to the optimistic "Generate"
affordance via `resolveHasAiKey()`, never a false "add your key" (post-deploy fix — see
archive). **Guardrail on every prompt:** synthesis only, no buy/sell/hold, no price target,
ends "…not investment advice." Insight cache (`src/lib/insights.ts`, `insights` collection):
per-user for stock (24 h) + portfolio (6 h), **cross-user shared** for IPO briefs
(`userId:null`, 12 h); a generation error is never cached. Mitra chat: `POST /api/ai/chat`
streams plain-text tokens on the Node runtime, context from `src/lib/ai/chatContext.ts`.
Default Gemini model is `gemini-3.6-flash` (2.5-flash is retired for new keys). The scripted
"Proactive insight" chat tiles are still a concept demo (Phase 9+ follow-up).

## Data flow

The dashboard app shell calls `services/fundamentals-api` directly from Next.js Server
Components (`FUNDAMENTALS_API_URL`, server-to-server — not proxied, since it's an existing
documented service being consumed) for all company/index/news/IPO/quote data, and MongoDB
directly (`src/lib/holdings.ts`, `alerts/store.ts`, `notifications/store.ts`,
`userSettings.ts`, `insights.ts`) for user-owned data. Client-side mutations and
live-as-you-type reads go through thin same-origin `/api/*` proxies (`/api/holdings`,
`/api/alerts`, `/api/notifications`, `/api/search`, `/api/news`, `/api/settings/ai`,
`/api/insights/*`, `/api/ai/chat`). The scheduled work is `GET|POST /api/cron/evaluate-alerts`.
All public endpoints are documented in [`/docs/api-surface.md`](./api-surface.md).

## MCP server (`/api/mcp`, Phase 9 — in progress)

Full rationale: [ADR 0019](./decisions/0019-phase-9-api-surface-mcp-rate-limiting.md).
The supported interface for automated / agent access to MarketMitra's **public**
data. A stateless Streamable HTTP MCP server mounted in the Next app
(`src/app/api/mcp/route.ts` via `mcp-handler`@2 + `@modelcontextprotocol/server`@2),
**not** a standalone service — the tools wrap the same `src/lib/dashboard/*`
clients the dashboard uses, which already call `services/fundamentals-api`.

- **Tools (`src/lib/mcp/tools.ts`, registered by `src/lib/mcp/server.ts`):**
  `search_symbols`, `get_quote`, `get_company_fundamentals` (optional
  `sections`), `get_price_history`, `get_news`, `list_ipos`,
  `get_market_indices` — all read-only. Zod input schemas; each `run()`
  returns a plain object, wrapped into a `CallToolResult` (pretty JSON text
  + `structuredContent`).
- **No auth in v1** (public data). Per-user tools (portfolio / alerts /
  settings) are deferred pending an MCP auth design. **Rate limiting is
  Phase 9 Part 2** (Upstash) — not yet built.
- **Guardrail parity with ADR 0018:** every data-touching result carries a
  "public reference data, not investment advice" note; news carries
  "headline tone, not a signal"; IPO GMP carries "unofficial estimate".
- **Discovery:** `public/llms.txt` (served at `/llms.txt`) points agents here.
- Endpoint + tool table: [`/docs/api-surface.md`](./api-surface.md).
- **Not yet done:** prod deploy (ships with Part 2), rate limiting, the
  interactive API explorer page (Part 3).

## Shipped features (see `/docs/archive/` for detail)

- **Landing page (`/`)** — [archive/landing-page.md](./archive/landing-page.md)
- **Dashboard shell (Phase 3 version, superseded 2026-09-05)** — [archive/dashboard-shell.md](./archive/dashboard-shell.md)
- **Auth pages (`/sign-in`, `/sign-up`)** — [archive/auth-pages.md](./archive/auth-pages.md)
- **Fundamentals data service + real-data dashboard (Phase 4)** — [archive/fundamentals-data-service.md](./archive/fundamentals-data-service.md)
- **Alerts engine (Phase 5)** — [archive/alerts-engine.md](./archive/alerts-engine.md)
- **News feed (Phase 6)** — [archive/news-feed.md](./archive/news-feed.md)
- **IPO tracker + GMP (Phase 7)** — [archive/ipo-tracker.md](./archive/ipo-tracker.md)
- **AI insights + Mitra chat (Phase 8)** — [archive/ai-insights.md](./archive/ai-insights.md)
