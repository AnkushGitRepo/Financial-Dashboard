# API Surface

Documented public API endpoints, intended for both the human dashboard UI and AI agent consumers. This describes the system **as it currently stands** — updated per feature, never pruned or archived.

Every endpoint here is a Next.js App Router route handler under `app/api/**/route.ts` (see [ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md)). Auth is via Clerk session ([ADR 0005](./decisions/0005-clerk-auth.md)) unless marked public.

## Conventions

- Response envelope: `{ success: boolean, data: <payload> | null, error: string | null }`
- Paginated responses include `meta: { total, page, limit }`
- All endpoints validate input at the boundary and return 4xx with a clear `error` message on invalid input.

## Endpoints

### `GET /api/holdings`
- **Purpose:** List the current user's portfolio holdings (symbol, quantity, average price — no live price; the UI merges live quotes from `services/fundamentals-api` client-side/server-side, this endpoint is the stored-position source of truth only).
- **Auth:** required — Clerk session in hosted mode; a fixed `"local"` user id in self-host mode (ADR 0010's single-local-user placeholder). See `src/lib/currentUserId.ts`.
- **Request:** none.
- **Response:** `data`: `{ id, userId, symbol, quantity, avgPrice, createdAt, updatedAt }[]`.
- **Errors:** `401` if not authenticated.

### `POST /api/holdings`
- **Purpose:** Add a new holding.
- **Auth:** required (see above).
- **Request:** body `{ symbol: string, quantity: number > 0, avgPrice: number > 0 }`, validated with Zod.
- **Response:** `data`: the created holding, `201` on success.
- **Errors:** `401` unauthenticated, `422` on invalid input (message from the Zod error).

### `PATCH /api/holdings/[id]`
- **Purpose:** Update a holding's quantity/average price.
- **Auth:** required; only the owning user's holding can be updated (matched by `userId` + `_id`).
- **Request:** body `{ quantity: number > 0, avgPrice: number > 0 }`.
- **Response:** `data`: the updated holding.
- **Errors:** `401` unauthenticated, `404` if the holding doesn't exist or belongs to someone else, `422` on invalid input.

### `DELETE /api/holdings/[id]`
- **Purpose:** Remove a holding.
- **Auth:** required; scoped to the owning user, same as `PATCH`.
- **Request:** none.
- **Response:** `data: null` on success.
- **Errors:** `401` unauthenticated, `404` if not found/not owned.

### `GET /api/notes`  _(Phase 10a — on `phase-10-rag`, not yet in prod)_
- **Purpose:** List the current user's research notes (ADR 0020). Notes also feed the user's private retrieval corpus (`docType: 'note'`).
- **Auth:** required (Clerk session / `local` user).
- **Request:** none.
- **Response:** `data`: `{ id, userId, title, body, symbol: string|null, createdAt, updatedAt }[]`, newest-updated first.
- **Errors:** `401` unauthenticated.

### `POST /api/notes`  _(Phase 10a)_
- **Purpose:** Create a note; fires a best-effort corpus sync.
- **Request:** `{ title: string(1–140), body: string(1–4000), symbol?: string(≤30)|null }`.
- **Response:** `data`: the created note, `201`.
- **Errors:** `401`, `409` when the per-user cap (200) is reached, `422` on a bad body.

### `PATCH /api/notes/[id]`  _(Phase 10a)_
- **Purpose:** Update a note (owner-scoped); re-syncs it into the corpus.
- **Request:** `{ title, body, symbol? }` (same shape as `POST`).
- **Response:** `data`: the updated note.
- **Errors:** `401`, `404` not found / not owned, `422` bad body.

### `DELETE /api/notes/[id]`  _(Phase 10a)_
- **Purpose:** Delete a note; removes its corpus chunks.
- **Response:** `data`: `{ id }`.
- **Errors:** `401`, `404` not found / not owned.

### `GET /api/search`
- **Purpose:** Live search across every NSE-listed equity plus the tracked indices, for the Markets/header search-as-you-type UI.
- **Auth:** public — no session required.
- **Request:** query param `q` (required, min length 1).
- **Response:** `data`-less shape (returns the array directly, not the `{success,data,error}` envelope — see note below): `[{ type: "company" | "index", symbol, name }]`, capped at 15 results, index matches first.
- **Errors:** empty `q` returns `[]`.
- **Note:** this is a thin proxy to fundamentals-api's own `GET /search` (see ADR 0012's amendment) — a deliberate, narrow exception to the "consume fundamentals-api directly from Server Components" rule below, needed only because live-as-you-type search must run client-side and the browser needs a same-origin endpoint. It intentionally doesn't follow this file's usual response envelope convention since it's a pass-through of the Python service's own response shape.

### `GET /api/alerts`
- **Purpose:** List the current user's alerts (all statuses), newest first. See [ADR 0014](./decisions/0014-alerts-engine-scope.md).
- **Auth:** required — Clerk session in hosted mode, fixed `"local"` user in self-host (`src/lib/currentUserId.ts`).
- **Request:** none.
- **Response:** `data`: `Alert[]` — `{ id, userId, type, symbol, params, note, status, rearm, cooldownMinutes, armed, cooldownUntil, lastEvaluatedAt, triggeredAt, lastObservedValue, createdAt, updatedAt }`. `type` ∈ `price_threshold | percent_move | week52_breach | portfolio_pnl`; `params` shape depends on `type`.
- **Errors:** `401` if not authenticated.

### `POST /api/alerts`
- **Purpose:** Create an alert.
- **Auth:** required (see above).
- **Request:** body validated with Zod, discriminated on `type`:
  - `price_threshold` — `{ type, symbol, params: { direction: "above"|"below", threshold: number>0 } }`
  - `percent_move` — `{ type, symbol, params: { direction: "up"|"down"|"either", pct: number (0,100] } }`
  - `week52_breach` — `{ type, symbol, params: { edge: "high"|"low", withinPct?: number [0,50] } }`
  - `portfolio_pnl` — `{ type, symbol?: string|null, params: { metric: "total_value"|"unrealized_pnl"|"unrealized_pnl_pct", direction: "above"|"below", threshold: number } }` (`symbol` present = scoped to that one holding; absent = whole book)
  - `ipo_watch` — `{ type, params: { triggers: { opens: bool, lastDay: bool, allotmentListing: bool }, gmpThresholdPct?: number, ipoType: "all"|"mainboard" } }` (ADR 0017). **One per user** — POSTing this upserts the user's IPO-watch subscription (returns `200`, not `201`).
  - `ipo` — `{ type, params: { ipoSlug: string, trigger: "opens"|"last_day"|"allotment_listing"|"gmp_threshold", gmpThresholdPct?: number, gmpThresholdAbs?: number } }` — a per-IPO alert set from a row on `/dashboard/ipos`.
  - plus optional `note` (≤200 chars), `rearm` (boolean, default false), `cooldownMinutes` (int 5–1440, default 60)
- **Response:** `data`: the created alert, `201`.
- **Errors:** `401` unauthenticated, `422` on invalid input.

### `PATCH /api/alerts/[id]`
- **Purpose:** Edit an alert's `params`, `note`, `rearm`, `cooldownMinutes`, or `status` (`active`|`paused` only — `triggered` is set only by the engine). Any edit that changes `params` or `status` re-arms the alert (clears the cooldown/fired gate).
- **Auth:** required; scoped to the owning user.
- **Request:** partial body; `params` (when present) is validated against the existing alert's `type`.
- **Response:** `data`: the updated alert.
- **Errors:** `401` unauthenticated, `404` if not found/not owned, `422` on invalid input.

### `DELETE /api/alerts/[id]`
- **Purpose:** Remove an alert.
- **Auth:** required; scoped to the owning user.
- **Response:** `data: null`.
- **Errors:** `401` unauthenticated, `404` if not found/not owned.

### `GET /api/notifications`
- **Purpose:** The in-app notification centre — the current user's notifications, newest first, plus an unread count. Alerts are the first producer; Phase 7/8 reuse this.
- **Auth:** required.
- **Request:** optional `limit` (1–100, default 50).
- **Response:** `data`: `Notification[]` — `{ id, userId, kind, title, body, href, meta, read, createdAt }`; `meta: { unread: number }`.
- **Errors:** `401` unauthenticated.

### `POST /api/notifications/read`
- **Purpose:** Mark notifications read.
- **Auth:** required.
- **Request:** body `{ id: string }` (one) or `{}` / `{ all: true }` (all of the user's unread).
- **Response:** `data: { updated: number }`.
- **Errors:** `401` unauthenticated, `422` on invalid input.

### `GET|POST /api/cron/evaluate-alerts`
- **Purpose:** Run one alert-evaluation cycle (ADR 0014 §3): load active alerts, batch-fetch live quotes from `services/fundamentals-api` `GET /quote`, run the per-type evaluators, transition each alert, and deliver notifications for newly-triggered ones. Vercel Cron calls this (GET) on `*/10 3-10 * * 1-5` (UTC — covers NSE hours); self-hosters point their own scheduler at the same URL.
- **Auth:** **not** a session — a `CRON_SECRET` bearer token. When `CRON_SECRET` is set, requires `Authorization: Bearer <CRON_SECRET>` (Vercel Cron adds this automatically). When unset: allowed in dev, refused (`503`) in production.
- **Request:** optional `?force=1` bypasses the NSE-trading-hours gate (for manual testing); still requires the token.
- **Response:** `data`: `{ ran: boolean, reason?, at, activeAlerts, symbolsQuoted, notified, skippedNoData, errors }`. `ran: false` when outside the trading session and not forced.
- **Errors:** `401` bad/missing token, `503` `CRON_SECRET` unconfigured in production, `500` if the cycle throws.
- **Note:** the handler degrades gracefully — a symbol with no live quote is skipped (counted in `skippedNoData`), never fired or auto-resolved on stale data.

### `GET /api/news`
- **Purpose:** Same-origin thin proxy to `services/fundamentals-api`'s `GET /news` (ADR 0015), so `/dashboard/news` can "load more" and toggle its holdings filter client-side without exposing `FUNDAMENTALS_API_URL` to the browser. Same narrow, deliberate exception as `/api/search`.
- **Auth:** public — news is public market data. (The holdings filter's symbol list is computed server-side in `/dashboard/news/page.tsx` and passed to the client, which forwards it here as `?symbols=`.)
- **Request:** `symbols` (optional, comma-separated), `limit` (1–50, default 20), `cursor` (opaque, from a previous response's `next_cursor`).
- **Response:** pass-through of the Python service's shape — `{ items: [{ url, title, summary, source, published_at, sentiment, sentiment_score, symbols[] }], next_cursor: string | null }`. Not the `{success,data,error}` envelope (same rationale as `/api/search`).
- **Errors:** upstream failure yields `{ items: [], next_cursor: null }`, not a 5xx.

### `GET|PUT|DELETE /api/settings/ai`
- **Purpose:** Manage the signed-in user's BYO AI provider key (ADR 0018 §2). Key is stored **AES-256-GCM-encrypted** in the `userSettings` Mongo collection, keyed on `SETTINGS_ENC_KEY`; it is decrypted only server-side per request and never returned to the browser.
- **Auth:** required (Clerk session in hosted mode; the fixed `local` user in self-host).
- **GET:** `data` = `{ provider, model, keyHint }` (last 4 chars of the key only) or `null` if none stored. `meta.encConfigured` reflects whether `SETTINGS_ENC_KEY` is set.
- **PUT:** body `{ provider: 'gemini'|'anthropic'|'openrouter', apiKey: string(10–400), model?: string }`. Runs a live `validateAiKey` round-trip before storing — a rejected key is never saved. `503` when `SETTINGS_ENC_KEY` is unset, `400` on a provider-rejected key, `422` on a bad body.
- **DELETE:** clears the stored key.

### `POST /api/insights/{stock|portfolio|ipo}`
- **Purpose:** Generate (or return a cached) neutral AI synthesis for one surface (ADR 0018). Guardrailed in `src/lib/ai/prompts.ts` — no buy/sell/hold, no price target, every response ends "This is a synthesis of public data, not investment advice."
- **Auth:** required. `stock` + `portfolio` use the caller's **own** key (or the `AI_*` env key **only** in self-host — `getUserAiConfig`); `ipo` also allows the deployment's key (ADR 0018 §5). `400 {error:'no_ai_key'}` when none is available.
- **Request:** `stock` → `{ symbol, force? }`; `portfolio` → `{ force? }`; `ipo` → `{ slug, force? }`. `force: true` bypasses a fresh cache.
- **Cache (`insights` collection, `{scope,key,userId}`):** `stock` per-user, keyed by symbol, 24h; `portfolio` per-user, key `'portfolio'`, 6h; `ipo` **cross-user shared** (`userId: null`), keyed by slug, 12h. A row is reused only while its input hash still matches and it is within the TTL.
- **Response:** `data` = `{ content, model, generatedAt }`; `meta.cached` = whether it came from the cache.
- **Errors:** `400` `no_ai_key` / no holdings / bad symbol-data; `404` unknown IPO slug; `502` on a generation failure (the error text is the provider's, normalised).

### `POST /api/ai/chat`
- **Purpose:** The "Mitra" widget's streamed chat (ADR 0018 pt.5). **As of Phase 10a (on `phase-10-rag`, not yet in prod)** it is an agentic tool-calling loop (`stopWhen: stepCountIs(5)`): the model has `search_context` (vector search over the retrieval corpus — indexed news, filings, the caller's own notes/holdings/questions) plus the 7 read-only market-data tools from the MCP layer. A small portfolio summary is still seeded into the system prompt. Guardrail (`CHAT_SYSTEM_AGENTIC`) unchanged — no buy/sell/hold, same "not investment advice" ending. Completed turns are persisted (`chatMessages`, 100/user rolling cap); the caller's recent questions are re-embedded as `chat:<userId>`. Everything degrades to the pre-Phase-10 prompt-stuffing path when vector search is unavailable.
- **Auth:** required. Per-user key rules identical to `/api/insights/stock` (`getUserAiConfig`). `400 {error:'no_ai_key'}` when none.
- **Request:** `{ messages: [{ role: 'user'|'assistant', content: string(1–2000) }] }`, 1–12 turns.
- **Response:** a `text/plain` **token stream** (`streamText().toTextStreamResponse()`), not the `{success,data,error}` envelope. Tool steps stay server-side — the client sees only assistant text. Consumed incrementally by `AiWidget.tsx`.
- **Errors:** `422` bad body, `400` `no_ai_key`, `502` if the stream can't start.

### `DELETE /api/ai/chat`  _(Phase 10a)_
- **Purpose:** Clear the caller's stored chat history and drop their `chat:<userId>` entry from the retrieval corpus.
- **Auth:** required.
- **Response:** `data`: `{ removed: <count> }`.
- **Errors:** `401` unauthenticated.

### `GET|POST /api/cron/index-corpus`  _(Phase 10a — on `phase-10-rag`, not yet in prod)_
- **Purpose:** Rebuild the shared retrieval corpus (ADR 0020): pull recent news + configured annual-report filings, chunk + locally embed, upsert into the `chunks` collection under `userId: null`, prune news past a retention window. Runs from `.github/workflows/index-corpus.yml` (every 2 h) and self-hosters' own schedulers.
- **Auth:** `CRON_SECRET` bearer, same contract as `/api/cron/evaluate-alerts` (dev-open, prod-`503` when unset).
- **Request:** `?indexesOnly=1` ensures the collection + Atlas Vector Search index and returns (self-host one-time setup); `?newsLimit=<n>` overrides how many recent news items are reconsidered.
- **Response:** `data`: `{ vectorIndex: 'created'|'exists'|'unavailable', news: { seen, changed, pruned }, filings: { seen, indexed, skipped }, errors: string[], ms }`.
- **Errors:** `401` bad token, `503` `CRON_SECRET` unconfigured in production, `500` if the run throws.
- **Note:** `vectorIndex: 'unavailable'` (non-Atlas MongoDB) is reported as a non-fatal error — writes still succeed; retrieval simply falls back until an Atlas cluster is used.

**Note:** the dashboard's stock/ratios/financials/shareholding/price/indices/quote/news data comes from `services/fundamentals-api` (a separate service, documented in its own `README.md` — see ADR 0011), consumed directly by Next.js Server Components rather than proxied through a `/api/*` route, since it's an already-documented service being consumed, not a new one MarketMitra is shipping. `/api/search` above is the one deliberate exception.

## MCP server — `/api/mcp` (Phase 9, ADR 0019)

The **supported interface for automated / agent access to public data.** A
stateless Streamable HTTP MCP server mounted in the Next app
(`src/app/api/mcp/route.ts` via `mcp-handler`), wrapping the same
`src/lib/dashboard/*` clients the dashboard uses. Tool logic lives in
`src/lib/mcp/tools.ts`; `src/lib/mcp/server.ts` registers it.

- **Endpoint:** `GET|POST /api/mcp` — client config `{ "url": "https://<host>/api/mcp" }`. Streamable HTTP (2025-era clients get the SDK's stateless fallback). No SSE, no sessions.
- **Auth:** none in v1 — all tools are read-only public data. Rate-limited (Phase 9 Part 2). Per-user tools (portfolio / alerts / settings) are explicitly deferred pending an MCP auth design.
- **Guardrail:** every tool result that touches market data carries a "public reference data, not investment advice" note; news carries "headline tone, not a signal"; IPO GMP carries "unofficial grey-market estimate".
- **Discovery:** `/llms.txt` (static, `public/llms.txt`) points agents here.

### Tools (v1)

| Tool | Input | Returns |
| --- | --- | --- |
| `search_symbols` | `{ query: string }` | `{ query, count, results: [{type,symbol,name}] }` — ≤15 matches across ~2,570 NSE equities + indices |
| `get_quote` | `{ symbols: string[1..50] }` | `{ count, quotes: QuoteOut[], missing: string[], note }` — unknown symbols reported in `missing`, never faked |
| `get_company_fundamentals` | `{ symbol: string, sections?: ("company"\|"ratios"\|"shareholding"\|"peers"\|"documents"\|"financials")[] }` | `{ symbol, found, company?, ratios?, shareholding?, peers?, documents?, financials?: {profit_and_loss,balance_sheet,cash_flow} }` — `found:false` with a hint when the symbol is unknown |
| `get_price_history` | `{ symbol: string, period?: "1mo"\|"6mo"\|"1y"\|"5y" }` (default `1y`) | `{ symbol, period, count, points: PricePointOut[] }` — newest first |
| `get_news` | `{ symbols?: string[≤20], limit?: 1..50, cursor?: string }` (default limit 20) | `{ count, items: NewsItem[], next_cursor, note }` — omit `symbols` for the broad stream; `sentiment` = headline tone only |
| `list_ipos` | `{ status?: "upcoming"\|"open"\|"closed"\|"listed" }` | `{ count, ipos: Ipo[], note }` — GMP fields are an unofficial third-party estimate |
| `get_market_indices` | `{}` | `{ count, indices: IndexQuoteOut[], note }` — NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX |

Field shapes (`QuoteOut`, `PricePointOut`, `NewsItem`, `Ipo`, `IndexQuoteOut`, …) are defined in `src/lib/dashboard/{fundamentalsApi,newsApi,iposApi}.ts` and documented in `services/fundamentals-api/README.md`. Any field can be null/empty when the free source chain came up short; every record carries `source_tier`.

<!--
Template for a new entry:

### `GET /api/<resource>`
- **Purpose:** <what it does>
- **Auth:** required (Clerk session) | public
- **Request:** <query params / body shape>
- **Response:** <shape of `data`>
- **Rate limits:** <if any>
- **Errors:** <notable error cases>
-->
