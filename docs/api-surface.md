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

**Note:** the dashboard's stock/ratios/financials/shareholding/price/indices data comes from `services/fundamentals-api` (a separate service, documented in its own `README.md` — see ADR 0011), consumed directly by Next.js Server Components rather than proxied through a `/api/*` route, since it's an already-documented service being consumed, not a new one MarketMitra is shipping. `/api/search` above is the one deliberate exception.

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
