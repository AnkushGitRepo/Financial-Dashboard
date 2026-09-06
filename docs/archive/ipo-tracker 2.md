# Archive — IPO Tracker + GMP Alerts (Phase 7)

Signed off 2026-09-06. Live summary in [`/docs/architecture.md`](../architecture.md);
full rationale in [ADR 0017](../decisions/0017-ipo-tracker-gmp-scope.md) (with a
2026-09-06 ToS amendment).

## What shipped

An IPO calendar + subscription data + **grey-market premium (GMP)**, scraped from one
aggregator and heavily caveated everywhere. Ingested in `fundamentals-api` with lazy TTL
refresh. Alerts **reuse Phase 5's engine** — two new discriminated-union variants
(`ipo_watch`, `ipo`) with four triggers. A `/dashboard/ipos` page + a dashboard-home widget.

## The ToS gate (resolved before build)

Chittorgarh's terms prohibit content reuse without permission; the site 403s bots.
**User decision: accept the trade-off** on the same terms as the Screener.in scraper —
isolated swappable module, GMP caveated and degrading to "unavailable", polite pacing.
Recorded in `/docs/data-sources.md` + ADR 0017 amendment. The actual source wired is
**InvestorGain's "Live IPO GMP" report** (a Chittorgarh-adjacent aggregator).

## Backend (`fundamentals-api`)

- **Migration `2796fbd6805c`** — `ipos` table: slug dedup, `status` indexed, category,
  4 dates, price, `ipo_size_cr`, lot, rating, `subscription_times`, anchor,
  `gmp` / `gmp_pct` / `gmp_low` / `gmp_high` / `gmp_updated_at`, `source_tier`. Config:
  `ipo_cache_ttl_minutes` (60), `ipo_listed_retention_days` (10), `ipo_ingest_token`.
- **`app/ingestion/tier3_ipo_scraper/`** — `_parse_ipo_rows(html, ref)`, a **pure** parser
  for the report's `<td data-label>` table: slug / category / status / GMP+range / rating /
  sub / price / size / lot / 4 dates (IST year-inference via `_parse_dmon`) / anchor.
  **Verified against a maintainer-saved page: 23 real IPOs, every field.** `nsepython` has
  no IPO helpers, so Tier 1 is a future direct-call attempt; Tier 3 is primary.
- **`app/services/ipo_service.py`** — `get_ipos(session, status?)` reads Postgres
  (ordered open → upcoming → closed → listed) with lazy TTL refresh; `ingest_ipos(session,
  rows)` is **update-first** upsert on slug (`ON CONFLICT (slug) DO UPDATE`; only creates a
  row for an unseen slug) + prunes IPOs whose listing date is >10 days past.
- **`GET /ipos?status=`** (read-only, serverless) + **`POST /ipos/ingest`** (`ipo_ingest_token`
  bearer, 503 when unset).

## Fetch is out of band (the SPA problem)

The report is a client-rendered SPA and Chromium can't ride in the Vercel Python function
(ADR 0013). `services/fundamentals-api/scripts/refresh_ipos.py` renders it with **Playwright
Chromium**, runs `_parse_ipo_rows`, and `POST`s to `/ipos/ingest`. JSON boundary: `_coerce`
turns ISO date strings back into `date` / `datetime`. `--dry-run` for local.
`.github/workflows/refresh-ipos.yml` — every ~2 h (03:00–15:00 UTC) + `workflow_dispatch`;
installs `playwright` + chromium.

## Alerts (Phase 5 reuse)

- Zod variants in `src/lib/alerts/schemas.ts` — `ipo_watch` + `ipo` in the discriminated
  union + `paramsSchemaForType`. Types: `IpoWatchParams` / `IpoAlertParams` / `IpoTrigger` /
  `IpoSnapshot`, plus `sentKeys` on `Alert`.
- `store.ts` — `getIpoWatch(userId)` + `upsertIpoWatch(userId, params)` (one per user,
  resets `sentKeys` on edit); `applyAlertTransition` patch accepts `sentKeys`.
- `src/lib/alerts/ipoAlerts.ts` — pure `istToday()`, `evaluateIpoAlert(params, ipo, today)`
  (date triggers + GMP crossing, null on missing data), `evaluateIpoWatch(params, ipos,
  sentKeys, today)` (per-`(slug, subkey)` hits, mainboard filter, `sentKeys` prune).
  Four triggers: **opens / last day / allotment+listing / GMP threshold**.
- `evaluateAlerts()` — one `getIpos()` per cycle *only when* IPO alerts exist; `ipo_watch`
  branch (multi-notify + `sentKeys` write) and `ipo` branch (`decideAlertTransition`
  reused); per-type copy (`buildIpoWatchPayload` / `buildIpoAlertPayload`).
- `POST /api/alerts` special-cases `ipo_watch` → `upsertIpoWatch` (returns 200).

## Frontend

- `src/lib/dashboard/iposApi.ts` client. **No `/api/ipos` proxy** — the page is a
  Server-Component read; expand/alert actions hit `/api/alerts` directly.
- `/dashboard/ipos` — `page.tsx` (reads the user's `ipo_watch`), `IposPageClient`
  (Open now / Upcoming / Recently closed-listed + "Notify me about IPOs" panel →
  `ipo_watch` upsert), `IpoRow` (collapsed = name + Mainboard/SME + status + GMP + dates;
  expand = price / lot / size / sub / allotment / listing / anchor / GMP-range + the
  "unofficial grey-market estimate" caveat + Source link + inline "Set alert" → per-IPO
  `ipo`). "IPOs" in `AppHeader` nav, not `MobileTabBar`.
- `IpoOpenCard` (`dashboard-charts/`) on `/dashboard` home — compact open-IPO list +
  "All IPOs →"; `dashboard/page.tsx` fetches `getIpos('open')`.

## User clarifications mid-build

Retention → **10 days** past listing (not 30). Ingest is **update-first**, not
delete-and-replace, so manually-corrected rows aren't clobbered by a later scrape.

## Tests

15 table tests for `ipoAlerts.ts`, +5 loop tests in `evaluate.test.ts`, 4 for `_coerce` /
token matrix on the ingest script. Next.js `npm test` 93; fundamentals-api `pytest` 67
(13 for the parser field-by-field, `_parse_dmon` year-rollover, route shape, 422, ingest 503).

## Deployment (2026-09-06)

Prod Neon migrated (`2796fbd6805c`); `IPO_INGEST_TOKEN` set on `marketmitra-fundamentals-api`;
both projects redeployed; `refresh_ipos.py` run once against prod (**Playwright render
validated**) → seeded **39 real IPOs** (1 open, 17 upcoming, 8 closed, 13 listed). Prod
`/ipos` + `/ipos?status=` serve live data; `/ipos/ingest` 401s without the token.
Regression-clean.

## Still open at sign-off (do not block — tracked in ROADMAP)

- **Activate `.github/workflows/refresh-ipos.yml`** (`gh secret set IPO_INGEST_TOKEN` + the
  same token as `IPO_INGEST_TOKEN` on the fundamentals-api Vercel project + `v2` as repo
  default branch). Until then prod IPO data is only as fresh as the last manual
  `refresh_ipos.py` run. The Playwright render step still needs one *CI* run to validate.
- Watch **one real IPO alert fire** on an actual trigger day.

## Explicitly out of v1 scope (ADR 0017)

GMP history/charts, buybacks / rights issues / NFOs, broker- or category-wise subscription
breakdown, "apply via broker" links, email delivery, a second GMP source / cross-checking.
