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

**Note:** the dashboard's stock/ratios/financials/shareholding/price/indices/quote data comes from `services/fundamentals-api` (a separate service, documented in its own `README.md` — see ADR 0011), consumed directly by Next.js Server Components rather than proxied through a `/api/*` route, since it's an already-documented service being consumed, not a new one MarketMitra is shipping. `/api/search` above is the one deliberate exception.

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
