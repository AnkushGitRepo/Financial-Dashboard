# MarketMitra v2 — Agent Entry Point

Read this first, every session. Keep this file SHORT — detail lives in `/docs/`, not here.

## Project summary

MarketMitra is a financial dashboard (Indian markets: indices, stocks, IPOs, news sentiment). v2 is a full teardown-and-rebuild of the v1 repo (Financial-Dashboard: React+Vite / Express / Django / Python scraper) into a single Next.js + MongoDB Atlas stack, built to serve both a human dashboard UI and a documented API surface an AI agent can call. See [ADR 0001](./docs/decisions/0001-teardown-and-rebuild.md).

## Current phase

**Phases 0-3, 5, 6 complete.** Context architecture, v1 teardown, Next.js/Clerk/MongoDB/Vercel scaffold (live at https://marketmitra-v2.vercel.app), landing page, dashboard shell, on-brand auth pages, README rewrite, MIT license, pushed to the `v2` branch on GitHub (not merged to `main`). **Phase 4 starting**: first feature is market indices/prices (real public market-data API), per the user's explicit choice.

## Stack (non-negotiable constraints)

- Next.js, App Router, TypeScript ([0002](./docs/decisions/0002-nextjs-app-router.md))
- CSS Modules + `styles/tokens.css` — **no Tailwind, no Bootstrap, no hand-rolled utility framework** ([0003](./docs/decisions/0003-css-modules-no-framework.md))
- Backend = Next.js API route handlers only, **no separate Express server** ([0004](./docs/decisions/0004-nextjs-api-routes-as-backend.md))
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

Deployment mode gate just shipped (not yet approved/archived — see [ADR 0010](./docs/decisions/0010-deployment-mode-gate.md) and the latest `/docs/session-log.md` entry): `NEXT_PUBLIC_DEPLOYMENT_MODE` (`hosted` | `selfhost`, default `selfhost`) gates Clerk auth and all billing UI via `isHosted()` in `src/lib/deployment-mode.ts`. The production Vercel env var (`NEXT_PUBLIC_DEPLOYMENT_MODE=hosted`) is now confirmed set by the user (2026-09-04). Do not run the archiving/pruning protocol on this feature until the user explicitly approves it as done.

Once approved: Phase 4, first feature: **market indices/prices** — research public market-data APIs for Indian indices/stocks first (rate limits, cost, ToS — see `/docs/data-sources.md`), per the "public APIs first" policy and the mandatory research-before-implementation step, before writing any code. Ship UI (dashboard) + documented API endpoint together, per the non-negotiable constraints above. Landing/dashboard/auth pages are done and archived — see `/docs/archive/` for their build detail if touching them again.

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
