# Archive — API Surface: MCP server, rate limiting, API explorer (Phase 9)

Signed off 2026-09-06. Live summary in [`/docs/architecture.md`](../architecture.md);
decision in [ADR 0019](../decisions/0019-phase-9-api-surface-mcp-rate-limiting.md);
per-endpoint reference in [`/docs/api-surface.md`](../api-surface.md) (living doc, not pruned).

## What shipped

1. **MCP server** at `/api/mcp` — 7 read-only tools for automated / agent access to public data.
2. **Fair-use rate limiting** — `@upstash/ratelimit` on the Next `/api/*` + `/api/mcp`, and a
   fixed-window limiter on the `services/fundamentals-api` public endpoints. Live in prod
   against an Upstash Redis store in `iad1`.
3. **Interactive API explorer** at `/dashboard/api` + a `public/openapi.json` cross-checked
   against the route handlers in CI.

Also done in the same window (a Phase 4 post-sign-off follow-up, but it lives here):
**Tier 1 filing-URL discovery** for financial statements.

---

## Part 1 — MCP server

- **Placement decision:** a route in the Next app (`src/app/api/mcp/route.ts` via
  `mcp-handler`@2 + `@modelcontextprotocol/server`@2), **not** a standalone `services/mcp/`.
  Rationale: the tools wrap `src/lib/dashboard/*`, which already calls `fundamentals-api` over
  HTTP — a standalone service would just add a third hop and a third deploy target. (Installed
  `@modelcontextprotocol/sdk`@1 first by mistake; `mcp-handler`@2 needs the `/server`@2
  packages.) Stateless Streamable HTTP; 2025-era clients get the SDK's legacy fallback.
- **Tools** — `src/lib/mcp/tools.ts` defines each as `{ name, config (title/description/zod
  inputSchema), run(args) }`; `src/lib/mcp/server.ts` `registerMarketMitraTools(server)` adapts
  them into `server.registerTool(...)`, wrapping each `run()` result as pretty-JSON `content`
  text + `structuredContent`:
  - `search_symbols`, `get_quote` (reports `missing` symbols, never fakes),
    `get_company_fundamentals` (optional `sections`; `found:false` + hint on unknown symbol;
    parallel fetch of ratios/shareholding/peers/documents/3×financials), `get_price_history`
    (default period `1y`), `get_news` (omits empty `symbols` → broad stream; "headline tone,
    not a signal"), `list_ipos` ("unofficial grey-market estimate"), `get_market_indices`.
  - Every data-touching result carries a "public reference data, not investment advice" note.
- **No auth in v1** — public data only. Per-user tools (portfolio / alerts / settings) are
  deferred pending an MCP auth design.
- `public/llms.txt` (served at `/llms.txt`) points agents at `/api/mcp` + `api-surface.md`.
- **Tests:** `src/lib/mcp/tools.test.ts` (17) — registry = exactly the 7 public tools, no
  per-user names; each tool's schema rejects bad input; each `run()` against a mocked
  `@/lib/dashboard/*`. Live smoke-tested: `initialize`, `tools/list` (all 7 with JSON Schema),
  `tools/call get_market_indices` → real NIFTY/SENSEX, schema rejection → `isError`.

## Part 2 — rate limiting

- **`src/lib/rateLimit.ts`** — `@upstash/ratelimit` sliding window. `checkRateLimit(req, tier,
  {userId?})`, `withRateLimit(handler, tier)`, `rateLimitResponse` (429 `{success:false,
  data:null,error}` + `Retry-After` + `RateLimit-*`), `rateLimitHeaders`. Keyed by Clerk
  `userId` else the first `x-forwarded-for` hop. **Fails open** on a limiter error.
- **Wiring** — two layers so each expensive route has exactly one limiter:
  - `src/proxy.ts` middleware rate-limits `/api/(.*)` at tier `default` (hosted mode only),
    **excluding** `/api/mcp*`, `/api/insights*`, `/api/ai*` (own stricter tiers) and
    `/api/cron*` (bearer-guarded). The middleware passes the `userId` from Clerk's callback.
  - `/api/mcp/route.ts` → `withRateLimit(handler, 'mcp')`.
  - `insights/{stock,portfolio,ipo}` + `ai/chat` → refactored to `async function handlePOST`
    + `export const POST = withRateLimit(handlePOST, 'ai')`.
- **fundamentals-api** — `app/ingestion/rate_limit.py`... actually `app/rate_limit.py` +
  an `@app.middleware("http")` in `main.py`. Fixed-window per client IP via the Upstash REST
  API (`httpx` only — no `redis` dep, works in the Vercel Python function). `/health` exempt.
  Fails open. `RATE_LIMIT_PER_MINUTE` default 120. Its URL is public + documented, so this
  closes the direct-access bypass of the Next front door.
- **Tiers (starting budgets, tuned later):** `default` authed 120/min · anon 30/min; `ai`
  authed 15 · anon 6; `mcp` authed 120 · anon 60. In code, not an ADR.
- **Self-host** — no Upstash env → `rateLimitEnabled = false`, everything passes. Unthrottled.
- **Env var name gotcha:** the Vercel **Upstash for Redis** integration injects
  `KV_REST_API_URL` / `KV_REST_API_TOKEN` (+ `KV_URL` / `REDIS_URL` / read-only token), *not*
  the Upstash-native `UPSTASH_REDIS_REST_*` the code originally read. Fixed to accept either
  (`KV_REST_API_* || UPSTASH_REDIS_REST_*`; Python side via `AliasChoices` + `populate_by_name`).
- **Provisioning (2026-09-06, by the user via the Vercel dashboard):** store
  `marketmitra-ratelimit`, "Upstash for Redis", Free (500k commands/mo), **primary region
  `iad1`** (co-located with the functions — a Mumbai primary would add ~200 ms to every
  rate-limit check), connected to **both** Vercel projects (Production + Preview).
- **Verified live:** `marketmitra-v2` `/api/search` — single request returns
  `RateLimit-Limit: 30 / Remaining: 29`; 40 rapid anon → first 29 `200`, rest `429`.
  `fundamentals-api` `/health` → no `RateLimit-*` (exempt); `/indices` → `Remaining` counts
  down 119→115. ADR 0016's landing-page "fair-use rate limits" line is now true.
- **Tests:** `src/lib/rateLimit.test.ts` (7), `tests/test_rate_limit.py` (6).

## Part 3 — interactive API explorer

- **`public/openapi.json`** — hand-kept OpenAPI 3.1 for all 15 `/api/*` operations (tags,
  `cookieAuth` / `cronBearer` schemes, request-body examples). Served at `/openapi.json`.
- **`/dashboard/api`** — server `page.tsx` reads the spec + the MCP tool list;
  `ApiExplorerClient.tsx` renders an MCP-server card (connection URL + config + tools) and a
  two-pane explorer: tag-grouped endpoint list with method chips, per-endpoint panel with
  path/query inputs + a JSON body textarea prefilled from the spec example, "Send" against the
  real deployment with `credentials:'include'`, pretty response + status + timing + a
  `RateLimit-*` readout, "Copy as curl". `--app-*` tokens. "API" added to the `AppHeader` nav.
- **`src/app/dashboard/api/openapi.test.ts`** (3) — the CI consistency check: every documented
  path resolves to a `route.ts`, every documented method is exported, no `route.ts` is
  undocumented.
- **Bugs found in prod verification, fixed:** (a) `POST /api/mcp` from the explorer → 406
  "Client must accept both application/json and text/event-stream" — the explorer + its
  copy-as-curl now send `Accept: application/json, text/event-stream` for `/api/mcp`;
  (b) MCP SSE responses rendered raw — `fmt()` now extracts and pretty-prints the `data:`
  JSON; (c) a hydration mismatch on the MCP URL (relative first, absolute after mount).

## Deploy history

MCP + explorer first (`hqgdf1gal`), rate-limit code inert (`d78bead`), Accept-header +
SSE-pretty-print fixes, fundamentals-api limiter (`229a6b3`), the `KV_REST_API_*` env fix
(`17c4fac`), then the rate-limit activation redeploys once Upstash was provisioned
(`chsaxkpoc` / `eo8vuc9qe`).

---

## Tier 1 filing-URL discovery (Phase 4 follow-up, built here)

- **`app/ingestion/filing_discovery.py`** — `discover_latest_financial_filing(nse_symbol,
  bse_code)` → `FilingRef` (exchange / period_end / period_type / consolidated / xbrl_url /
  pdf_url / filed_at) or `None`. NSE `/api/corporates-financial-results` (primary, same
  cookie handshake as the shareholding call), BSE `api.bseindia.com/.../AnnGetData/w`
  (fallback, PDF-only, results-category + a period parseable from the announcement subject).
  Pure parsers `parse_nse_financial_results` / `parse_bse_annget_data` / `pick_latest`
  (newest period → consolidated → has-XBRL). `extract_tier1_line_items` downloads the XBRL
  (→ `xbrl_parser`) or PDF (→ `pdf_financials`) and attaches the discovered period.
- **Wired into `fundamentals_service.get_financial_statement`** ahead of the Screener scrape:
  Tier 1 items → upsert as `tier1_nse_bse` and skip Tier 3 for that call; else Tier 3 as
  before (history + fallback). New `_upsert_financial_items` helper. `financials_tier1_enabled`
  config flag.
- **Prod-startup regression, caught + fixed same day:** the first deploy 500'd the
  fundamentals-api — `filing_discovery` imported `pdf_financials` at module load, which does
  `import pdfplumber`, which the trimmed production `requirements.txt` deliberately omits
  (ADR 0013) → `ModuleNotFoundError` → `FUNCTION_INVOCATION_FAILED` on every route. Fixed by
  lazy-importing `pdf_financials` inside the PDF branch only; `xbrl_parser` (→ `lxml`, which
  *is* in requirements) stays a normal import. **Lesson:** anything on `fundamentals_service`'s
  import chain must pull only from the trimmed `requirements.txt`.
- **Reality in the hosted deployment:** NSE is Akamai-blocked from Vercel too, so discovery
  finds nothing and financials still come from Tier 3 — exactly the fail-safe design.
  Verified: `/companies/RELIANCE/financials/profit_and_loss` → 200, 144 rows, all
  `tier3_screener`. The Tier 1 machinery produces data only from an environment where
  NSE/BSE respond (a self-hoster in India, etc.).
- **Tests:** `tests/test_filing_discovery.py` (13) + `nse_financial_results.json` /
  `bse_annget_data.json` fixtures. fundamentals-api suite 86 passed.
- **Follow-up:** verify the NSE/BSE parsers against real live responses and correct the field
  maps; multi-period XBRL context extraction (the parser currently collapses to last-context).

## Explicitly out of Phase 9 v1 scope (ADR 0019)

Per-user / authenticated MCP tools; API keys / a developer portal / usage dashboards;
Markdown or other content-negotiated response modes on the REST routes (the MCP server is the
structured agent interface); gRPC / GraphQL / websocket surfaces; monetized rate tiers.
