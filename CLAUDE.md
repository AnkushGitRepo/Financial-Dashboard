# MarketMitra v2 — Agent Entry Point

Read this first, every session. Keep this file SHORT — detail lives in `/docs/`, not here.

## Project summary

MarketMitra is a financial dashboard (Indian markets: indices, stocks, IPOs, news sentiment). v2 is a full teardown-and-rebuild of the v1 repo (Financial-Dashboard: React+Vite / Express / Django / Python scraper) into a single Next.js + MongoDB Atlas stack, built to serve both a human dashboard UI and a documented API surface an AI agent can call. See [ADR 0001](./docs/decisions/0001-teardown-and-rebuild.md).

## Current phase

**Phases 0–8 complete and signed off (2026-09-06).** Everything through the AI insights layer is built, deployed to production, and archived: scaffold + deployment-mode gate, landing page, auth pages, dashboard shell, the fundamentals data service (`services/fundamentals-api/`) + real-data dashboard, alerts engine, news feed, IPO tracker + GMP, and AI insights + Mitra chat. Code is on the `v2` branch (not merged to `main`). Per-feature build detail lives in `/docs/archive/*.md`; `/docs/architecture.md` has the current-state summaries.

**Phase 9 is scoped and ready to build** ([ADR 0019](./docs/decisions/0019-phase-9-api-surface-mcp-rate-limiting.md), checklist in ROADMAP.md, 🔄): (1) a full **MCP server** exposing read-only public data as agent tools, (2) **Upstash Redis** rate limiting on `/api/*` + fundamentals-api + the MCP server, (3) a hosted **interactive API explorer** page. Phases 10–11 stay ❓. A handful of small non-blocking follow-ups from Phases 4–8 (Tier 1 filing discovery, activating the two GitHub Actions schedulers, Resend email, DRHP grounding, replacing scripted chat tiles) are under "Post-sign-off follow-ups" in ROADMAP.md.

**`main` now holds the v2 rebuild** — `v2` was merged to `main` 2026-09-06 (merge commit, fast-forwardable) so the GitHub Actions cron schedulers fire. Both branches are currently identical; start new feature work from a fresh branch off `main`.

## Stack (non-negotiable constraints)

- Next.js, App Router, TypeScript ([0002](./docs/decisions/0002-nextjs-app-router.md))
- CSS Modules + `styles/tokens.css` — **no Tailwind, no Bootstrap, no hand-rolled utility framework** ([0003](./docs/decisions/0003-css-modules-no-framework.md))
- Backend = Next.js API route handlers only, **no separate Express server** ([0004](./docs/decisions/0004-nextjs-api-routes-as-backend.md)) — **scoped exception:** `services/fundamentals-api/` is a standalone Python/FastAPI service for data ingestion/serving, justified by Python-only tooling with no TS equivalent ([0011](./docs/decisions/0011-three-tier-fundamentals-data-sourcing.md)). The main app's own backend is unaffected.
- MarketMitra has **no paid tier, no billing, no trial limits** — free and open-source, full stop. Data sourcing uses free libraries/sources only, identically in hosted and self-hosted mode ([0011](./docs/decisions/0011-three-tier-fundamentals-data-sourcing.md)).
- Auth = Clerk ([0005](./docs/decisions/0005-clerk-auth.md))
- DB = MongoDB Atlas, Hosting = Vercel, deployed early not late ([0006](./docs/decisions/0006-vercel-mongodb-atlas-deployment.md))
- Every feature ships UI + documented API endpoint together — never one without the other.
- Never invent metrics/user counts/"battle-tested" language in README or copy. This is a fresh v2 — say so plainly.

## Docs map

- `/docs/architecture.md` — current system architecture (routes, components, data flow)
- `/docs/design-system.md` — colors/type/spacing/component patterns; **build every new page against this, not the last page**
- `/docs/decisions/` — ADRs, one per decision, numbered, **never pruned**
- `/docs/data-sources.md` — every external API/scraper: endpoint, auth, rate limits, cost, ToS
- `/docs/api-surface.md` — public API endpoints for agent consumers: request/response, auth, limits
- `/docs/session-log.md` — rolling session log (recent entries only)
- `/docs/archive/` — full detail for shipped features + old session-log rollup

**Read `/docs/session-log.md` last 3 entries before starting work.**

## Active focus

**Phase 9 — scoped 2026-09-06 ([ADR 0019](./docs/decisions/0019-phase-9-api-surface-mcp-rate-limiting.md)), build not started.** Three parallel deliverables, full checklist in ROADMAP.md:
1. **MCP server** (`services/mcp/` or an `/api/mcp/[transport]` route group — spike first) exposing read-only public data as tools: `search_symbols`, `get_quote`, `get_company_fundamentals`, `get_price_history`, `get_news`, `list_ipos`, `get_market_indices`. Must reuse `src/lib/*`, not re-implement. Per-user tools + API keys are out of v1.
2. **Rate limiting** — Upstash Redis via the Vercel Marketplace (load the `marketplace` skill first), `@upstash/ratelimit` sliding window keyed by Clerk `userId` else IP, applied to `/api/*` + the MCP path + fundamentals-api's public endpoints. Self-host with no Upstash env = no-op pass-through. Makes the ADR 0016 landing-page "fair-use rate limits" claim true.
3. **Interactive API explorer** page (`/dashboard/api`) — pick endpoint, fill params, send against the real deployment with the viewer's session, copy-as-curl.

Phases 10 (RAG) and 11 (multi-agent, TradingAgents-pattern in-house) are still ❓ — gated on a discussion, and can build on Phase 9's MCP tool layer.

**Standing facts that outlived the phase detail:**

- **Deploy mechanism:** both Vercel projects deploy via the Vercel CLI
  (`vercel deploy --prod --yes`; `.vercel/project.json` linked to `marketmitra-v2`). The CLI
  session is authenticated as the user and persists locally. `services/fundamentals-api/`
  → `https://marketmitra-fundamentals-api.vercel.app` (Vercel Python fn + Neon Postgres,
  [ADR 0013](./docs/decisions/0013-fundamentals-api-vercel-hosting.md)); `marketmitra-v2`
  → `https://marketmitra-v2.vercel.app`.
- **Deployment-mode gate** ([ADR 0010](./docs/decisions/0010-deployment-mode-gate.md)) is
  live in prod (`NEXT_PUBLIC_DEPLOYMENT_MODE=hosted`). Every new feature must respect
  `isHosted()`; feature backends gate on their own config env vars, never `isHosted()`.
- **Prod runs on a Clerk *dev* instance** (`touched-perch-1357.clerk.accounts.dev`) —
  pre-existing; bare `curl` of `/` or any `/dashboard/*` sees a handshake/rewrite only a
  real browser completes. Not a regression.
- **No paid tier, ever.** The landing page's "Two ways to run it" framing is settled
  ([ADR 0016](./docs/decisions/0016-landing-page-no-paid-tier-reconciliation.md)); the
  hosted instance's fair-use rate limiting is *claimed on the page but not built* — Phase 9.
- **Post-sign-off follow-ups** (small, non-blocking) are listed in ROADMAP.md after Phase 8:
  Tier 1 filing-URL discovery, activating the alert-eval + IPO-refresh GitHub Actions
  schedulers, Resend email delivery, one real alert fire + one real IPO-alert fire in
  market hours, DRHP grounding for IPO briefs, replacing the scripted "Proactive insight"
  chat tiles.

## Context maintenance protocol

When a feature/milestone is approved as done ("approved, moving on"), before starting new work:

1. Collapse the finished feature's detail in `/docs/architecture.md` to a 3-5 line summary + link to its archive file.
2. Move full build detail (why, gotchas, abandoned approaches) to `/docs/archive/<feature-name>.md`.
3. If `/docs/session-log.md` exceeds ~15-20 entries, roll the oldest into `/docs/archive/session-log-archive.md` (compressed) and trim the live file.
4. Update "Active focus" above to the new feature — no carried-forward detail on the finished one.
5. Never prune `/docs/decisions/`, `/docs/data-sources.md`, or `/docs/api-surface.md` — those are living reference, updated not archived.
6. Log the pruning itself as a one-line session-log entry.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
