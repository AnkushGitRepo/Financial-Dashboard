# 0019: Phase 9 — API surface formalization, MCP server, rate limiting

Date: 2026-09-06
Status: accepted (scoping decision — no code written yet)

## Context

Phase 9 in `ROADMAP.md` was marked ❓ with three open threads: how the public
API is documented/exposed for AI-agent consumers ("JSON/Markdown response
modes" from the original brief), what a "testing playground" is, and what
"agent-context prompts" concretely means. Plus a fourth item folded in from
[ADR 0016](./0016-landing-page-no-paid-tier-reconciliation.md): the hosted
instance's **fair-use rate limiting** is claimed on the landing page but
nothing enforces it.

This ADR is the output of the dedicated scoping session. The v1 build
checklist lives in `ROADMAP.md` under Phase 9.

### Relevant existing state

- **`/docs/api-surface.md`** already documents every `/api/*` route
  (request/response/auth/errors), maintained per-phase and never pruned. It
  is the human-facing reference and stays that way.
- **The public API is Next.js route handlers** under `src/app/api/**/route.ts`
  ([ADR 0004](./0004-nextjs-api-routes-as-backend.md)), Clerk-session auth
  ([ADR 0005](./0005-clerk-auth.md)) except where marked public. Response
  envelope `{ success, data, error }` (with two documented exceptions:
  `/api/search`, `/api/news` proxy the Python service's own shape).
- **`services/fundamentals-api`** (FastAPI, [ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md))
  is a second HTTP surface, currently consumed only server-to-server by the
  Next.js app; several of its endpoints (`/search`, `/quote`, `/news`,
  `/ipos`, company data) are the actual data an agent would want.
- **No Redis / KV store** in the stack today. MongoDB Atlas (main app) +
  Neon Postgres (fundamentals-api). Vercel KV / Vercel Postgres are
  retired products — anything new comes through the **Vercel Marketplace**
  (`vercel integration`).
- **Deployment-mode gate** ([ADR 0010](./0010-deployment-mode-gate.md)):
  self-host must stay full-featured and unthrottled. Rate limiting is a
  **hosted-only** concern — gated on config, not `isHosted()` directly, but
  effectively off in self-host (no limiter store configured → no limit).
- **MarketMitra has no paid tier** — "fair use" here means abuse
  protection, not monetization tiers.

### Scoping answers (user)

1. **Agent-facing API surface → a full MCP server.** Not a Markdown
   response mode on the REST routes, not just an `llms.txt`. Agents consume
   MarketMitra through MCP tools.
2. **Rate limiting → Upstash Redis via the Vercel Marketplace**
   (`@upstash/ratelimit` sliding window), on the Next.js `/api/*` routes and
   the fundamentals-api public endpoints.
3. **Testing playground → a hosted interactive API explorer page** in the
   app (pick endpoint → fill params → see live response).

## Decision

Phase 9 delivers three things, buildable largely in parallel:

### 1. MCP server — `/api/mcp` route in the Next app

- **Transport:** Streamable HTTP MCP server (not stdio) so it's hostable on
  Vercel and callable by remote agents. A stdio entrypoint may be added for
  local use if cheap.
- **Placement — RESOLVED 2026-09-06 (build): a route inside the Next app**
  (`src/app/api/mcp/route.ts`) via **`mcp-handler`@2** (Vercel's adapter,
  wraps `@modelcontextprotocol/server`@2 — the SDK v2 packages; `mcp-handler`
  does not inspect the pathname so no `[transport]` segment is needed),
  *not* a standalone `services/mcp/`. Rationale: the v1 tools wrap `src/lib/dashboard/*`
  functions that already exist (`searchSymbols`, `getQuotes`, `getCompany`
  et al., `getNews`, `getIpos`, `getIndices`) — those already call
  `fundamentals-api` over HTTP, so a standalone MCP service would just add a
  third hop and a third deploy target for zero benefit. The route group
  reuses `FUNDAMENTALS_API_URL`, the same libs, the same CI/test suite, and
  the same Vercel project. Stateless Streamable HTTP (no Redis needed for
  the MCP transport itself; Part 2's rate-limit store is separate).
- **Tools (v1)** — read-only, mapping to existing capability:
  `search_symbols`, `get_quote`, `get_company_fundamentals` (ratios /
  financials / shareholding / peers / about / documents), `get_price_history`,
  `get_news` (global + by symbol), `list_ipos`, `get_market_indices`.
  Portfolio/holdings/alerts/settings tools are **out of v1** — they need
  per-user auth through MCP, which is its own scoping question.
- **Auth:** v1 tools are all public data → the server is unauthenticated but
  **rate-limited** (see §2). Per-user tools wait for an MCP auth story.
- **Guardrail parity:** any tool that surfaces AI-generated text carries the
  same "synthesis of public data, not investment advice" framing as
  [ADR 0018](./0018-ai-insights-scope.md). v1 tools are raw data, so this is
  mostly moot until an `explain_*` tool is added.
- **This replaces "JSON/Markdown response modes"** from the original brief —
  the REST routes stay JSON-only; MCP is the structured agent interface.
- **`llms.txt`** — a small static `/.well-known/llms.txt` (or `/llms.txt`)
  pointing at the MCP server + `api-surface.md` is cheap and worth including.

### 2. Rate limiting — Upstash Redis (`@upstash/ratelimit`)

- **Provision** the Upstash Redis integration through the Vercel Marketplace
  (`vercel integration add` — follow the `marketplace` skill at build time).
  It injects `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- **Limiter:** `@upstash/ratelimit` sliding-window. Key by Clerk `userId`
  when authenticated, else by client IP (`x-forwarded-for` first hop).
- **Where:** a shared helper (`src/lib/rateLimit.ts`) called at the top of
  every `/api/*` route handler (or via a wrapper), plus the MCP server's
  request path. The fundamentals-api public endpoints get an equivalent
  Python check (`fastapi-limiter` or a hand-rolled Upstash REST call — TBD
  at build).
- **Tiers (starting point, tune later):** authenticated users a generous
  per-minute + per-day budget; anonymous/IP a tighter one; the AI insight
  and chat routes a much lower budget (they cost the user's own tokens, but
  still protect shared cache + our egress). Exact numbers land in
  `ROADMAP.md` / the route code, not here.
- **Response:** `429` with `{ success:false, error:"rate limit exceeded",
  data:null }` + `Retry-After` and `RateLimit-*` headers.
- **Self-host:** if the Upstash env vars are absent, the limiter is a no-op
  pass-through. Documented in the README + `.env.local.example`.
- **Landing-page claim:** once this ships, the ADR 0016 "fair-use rate
  limits" line on the landing page is true — cross-reference it.

### 3. Interactive API explorer (`/dashboard/api` or `/api-explorer`)

- An in-app page listing every documented endpoint (source of truth:
  a machine-readable spec — likely a hand-kept `openapi.json` generated
  from / checked against `api-surface.md`, decided at build). For each:
  method, path, params form, "Send" against the real deployment (using the
  viewer's own session), pretty-printed response, and a copy-as-curl button.
- Public endpoints work for anyone; authed endpoints use the signed-in
  session. No secret entry in the UI.
- This is also where the MCP server is documented for humans (connection
  URL, tool list).
- Built against `/docs/design-system.md` + the `--app-*` token subset, like
  every other dashboard page.

## Consequences

- **First MCP server in the repo.** Adds `@modelcontextprotocol/sdk` and, if
  standalone, a third entry under `services/`. A new deploy target on Vercel.
- **First Redis dependency.** One new Vercel Marketplace integration
  (Upstash) — consistent with the "platform-native integrations before
  custom infra" rule; no new standalone third-party account beyond what the
  marketplace flow creates.
- **`api-surface.md` stays the human reference;** a new `openapi.json` (or
  equivalent) becomes the machine reference feeding the explorer and
  cross-checked in CI against the route handlers.
- **Per-user MCP tools are explicitly deferred** — portfolio/alerts/settings
  over MCP need an auth design (API keys? OAuth? Clerk machine tokens?) that
  is its own decision, not blocking Phase 9 v1.
- **Rate-limit numbers are not frozen here** — they live in code/config and
  will be tuned against real traffic.
- Phase 10 (RAG) and Phase 11 (multi-agent) can build on the MCP tool layer
  rather than re-plumbing data access.

## Explicitly out of Phase 9 v1 scope

- Per-user / authenticated MCP tools (portfolio, alerts, settings, holdings
  mutations).
- API keys / a developer-portal / usage dashboards.
- Markdown or other content-negotiated response modes on the REST routes
  (superseded by the MCP server).
- gRPC / GraphQL / websocket surfaces.
- Monetized rate tiers (there is no paid tier).
- Rate limiting as a Vercel Firewall/WAF config instead of app-level
  (rejected: less granular, no per-user keying, harder to mirror in
  self-host and in the Python service).
