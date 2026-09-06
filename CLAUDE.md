# MarketMitra v2 — Agent Entry Point

Read this first, every session. Keep this file SHORT — detail lives in `/docs/`, not here.

## Project summary

MarketMitra is a financial dashboard (Indian markets: indices, stocks, IPOs, news sentiment). v2 is a full teardown-and-rebuild of the v1 repo (Financial-Dashboard: React+Vite / Express / Django / Python scraper) into a single Next.js + MongoDB Atlas stack, built to serve both a human dashboard UI and a documented API surface an AI agent can call. See [ADR 0001](./docs/decisions/0001-teardown-and-rebuild.md).

## Current phase

**Phases 0–10a signed off + archived; Phase 10b scoped (ADR 0020), not started.** Everything through the retrieval layer is live in production. Per-feature build detail lives in `/docs/archive/*.md`; `/docs/architecture.md` has the current-state summaries; `/docs/session-log.md` has the play-by-play.

**Phase 10a — RAG** ([ADR 0020](./docs/decisions/0020-phase-10-rag-chat.md)) — done, archived, deployed + verified live on hosted 2026-09-07. `chunks` collection + Atlas Vector Search index; **embeddings run on `services/fundamentals-api` `POST /embed`** (`fastembed`, `bge-small-en-v1.5`, 384-dim — NOT in the Next app; `onnxruntime-node` won't load on Vercel), `src/lib/rag/embed.ts` is an HTTP client to it; `POST /api/cron/index-corpus` (`.github/workflows/index-corpus.yml`, every 2 h); agentic tool-calling chat (`search_context` + the 7 MCP tools); retrieval-grounded stock/portfolio/IPO insights; per-user layer (`/api/notes` + `/dashboard/notes`, holdings snapshot, chat history). **Everything degrades to pre-Phase-10 behaviour** when the corpus/embed service is unavailable. Full detail + the onnxruntime saga: [`/docs/archive/rag-chat.md`](./docs/archive/rag-chat.md). `EMBED_DIM = 384` must stay in lockstep across `embed.ts` / `embeddings.py` / the index def in `chunks.ts`.

**Phase 10b** — a dedicated `/dashboard/research` surface — scoped in ADR 0020, **not built**. **Phase 11** (multi-agent) still ❓ — needs its own scoping session.

**Still open** (non-blocking): one real alert fire + one real IPO-alert fire in market hours; README self-host note for the RAG env; pre-bundle the embedding model (kills a ~18s cold-instance download); a "clear chat history" control in the widget; filings-in-corpus needs an un-blocked PDF host (BSE 403s Vercel's IP). Optional Resend verified domain in `ALERT_EMAIL_FROM`; rotate the Resend + Resend keys pasted in chat.

**`main` = `v2`** — merged 2026-09-06 so the GitHub Actions `schedule:` triggers fire; every commit since is pushed to both. Start new feature work from a fresh branch off `main`.

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

**No build in flight.** Phases 0–10a are signed off, archived, and in production. The next feature-level work is **Phase 10b** (a dedicated `/dashboard/research` surface — scoped in [ADR 0020](./docs/decisions/0020-phase-10-rag-chat.md), not built) or **Phase 11** (multi-agent — ❓, needs a scoping session first). Neither should be started from assumptions.

The `src/lib/rag/` layer + the MCP tools are the foundation for both — Phase 10b builds a UI on `retrieve()`; Phase 11 orchestrates the tool-calling chat that already exists.

**Non-blocking follow-ups** (see ROADMAP.md): README self-host note for the RAG env (`FUNDAMENTALS_API_URL` reachable from the app + `IPO_INGEST_TOKEN` shared between the two services); pre-bundle the `bge-small` embedding model; a "clear chat history" control in `AiWidget`; filings-in-corpus (blocked — BSE 403s Vercel); one real alert fire + one real IPO-alert fire in market hours.

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
  hosted instance's fair-use rate limiting shipped in Phase 9 and is live (Upstash).
- **Post-sign-off follow-ups** (small, non-blocking) are listed in ROADMAP.md after Phase 8:
  activating the alert-eval + IPO-refresh GitHub Actions schedulers, Resend email delivery,
  DRHP grounding for IPO briefs, one real alert fire + one real IPO-alert fire in
  market hours.

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
