# 0017: IPO tracker + GMP alerts — Phase 7 scope

Date: 2026-09-06
Status: accepted (scoping decision — no code written yet)

## Context

Phase 7 in `ROADMAP.md` was a one-line placeholder marked ❓ ("GMP data
source … exact alert trigger logic … reuse of Phase 5's alert delivery
pipeline"). This ADR is the output of the dedicated scoping session; the
build checklist lives in `ROADMAP.md` under Phase 7.

Relevant existing state:

- **Phase 5** ([ADR 0014](./0014-alerts-engine-scope.md)) shipped a
  generic alerts engine: `alerts` + `notifications` MongoDB collections, a
  discriminated-union alert schema, `evaluateAlerts()` cron loop,
  `deliverNotification()` (in-app always; webhook when configured; email a
  config-gated stub), and the `?force=` / `CRON_SECRET` cron route.
- **Phase 6** ([ADR 0015](./0015-news-feed-scope.md)) established the
  pattern for ingesting external data in `fundamentals-api` with **lazy
  TTL refresh-on-read** over Postgres.
- **[ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md):** free
  sources only, no paid vendors; scraping is last resort and needs a ToS
  review **resolved before** implementation.
- Phase 7's title says "nodemailer" — that predates ADR 0014's decision to
  defer email. IPO alerts use the same `deliverNotification` path; email
  is not a Phase 7 concern.

Scoping answers (user): **include GMP (scraped, heavily caveated)**; **all
four alert triggers** (opens / last day / allotment+listing / GMP
threshold); **both** a global "IPO watch" subscription and per-IPO alerts;
**a dedicated `/dashboard/ipos` page plus a dashboard-home widget**.

## Decisions

### 1. Data — in `fundamentals-api`, two sources, lazy TTL refresh

New `app/ingestion/ipos.py` (+ an isolated `app/ingestion/tier3_ipo_scraper/`
for the aggregator, mirroring `tier3_screener_scrapling/`).

- **IPO calendar + subscription status:** Tier 1 = NSE/BSE public IPO
  endpoints (`nsepython` / BSE). NSE is frequently Akamai-blocked from
  this environment (ADR 0011), so in practice **Tier 3 (aggregator
  scrape) will often be the working primary**, exactly as happened with
  ratios in Phase 4. `source_tier` on every row makes which one produced
  it visible.
- **GMP (grey-market premium):** aggregator scrape only — GMP has no
  official or free-API source; it is published by grey-market trackers
  (Chittorgarh, InvestorGain, IPO Watch). Pick **one** site, scrape the
  IPO dashboard page that carries calendar + subscription + GMP together
  (Chittorgarh's `ipo_dashboard` is the leading candidate), in an
  isolated, swappable module.
  - **GMP is labelled everywhere as:** "an unofficial estimate from
    grey-market dealers, compiled by a third-party tracker — not from any
    exchange, not a prediction." Same honesty bar as the VADER sentiment
    tag (ADR 0015).
  - **ToS gate:** the chosen site's terms must be reviewed and recorded in
    `/docs/data-sources.md` **before** the scraper is written (standing
    rule). If the review comes back clearly hostile, fall back to
    GMP-display-only from a different site, or drop GMP for v1 — but the
    scoping decision is to include it.

Storage — one Postgres table `ipos`: identity + slug (dedup key), exchange,
`ipo_type` (`mainboard` | `sme`), `status` (`upcoming` | `open` |
`closed` | `listed`), the four dates (open / close / allotment / listing),
price band, lot size, issue size, latest `subscription_times`, latest
`gmp` + `gmp_pct` + `gmp_updated_at`, `source_tier`, `fetched_at`. No GMP
history table in v1 — the alert evaluator compares current GMP to the
alert's stored `lastObservedValue`, same as a price-threshold alert.

`ipo_cache_ttl_minutes` (~60) in `config.py`; a read past the TTL
re-scrapes first.

### 2. Serving — `GET /ipos`

`GET /ipos?status=upcoming|open|closed|listed` (omit for all), newest-
relevant first. Response row carries everything above, GMP included with
its `gmp_updated_at`. Documented in the `fundamentals-api` README +
`/docs/data-sources.md` (aggregator entry with the ToS line).

### 3. Alerts — reuse Phase 5, two new alert kinds

Both live in the existing `alerts` collection and the one
`evaluateAlerts()` cron loop (that generality is the point of ADR 0014).
A new branch in the loop fetches `GET /ipos` once per cycle and evaluates
IPO alerts against it, with `now` in `Asia/Kolkata`.

- **`ipo_watch` — one per user.** Params: `{ triggers: { opens, lastDay,
  allotmentListing }, gmpThresholdPct?, ipoType: 'all' | 'mainboard' }`.
  Fires once per (IPO, trigger) pair — the doc keeps a `sentKeys` set
  (`"<ipoSlug>:<trigger>"`), pruned for IPOs whose listing date is >30
  days past. A single watch can produce several notifications in one cycle
  (one per newly-eligible IPO).
- **`ipo` — per-IPO, set from the `/dashboard/ipos` row** ("Set alert",
  like the stock page). Params: `{ ipoSlug, trigger: 'opens' | 'last_day'
  | 'allotment_listing' | 'gmp_threshold', gmpThresholdPct?,
  gmpThresholdAbs? }`. One-shot (fires then → `triggered`); a
  `gmp_threshold` alert may opt into re-arm + cooldown, reusing
  `decideAlertTransition` unchanged.

Trigger semantics (evaluated per cycle):
- `opens` — IPO status transitions to `open` (or open_date ≤ today <
  close_date and not yet sent).
- `last_day` / `lastDay` — today == close_date (the "don't miss it"
  reminder); a single fire on that day.
- `allotment_listing` / `allotmentListing` — today == allotment_date, and
  again today == listing_date (two distinct `sentKeys`).
- `gmp_threshold` — current `gmp_pct` (or `gmp`) crosses the configured
  level; skipped, never fired, when GMP is unavailable for that IPO
  (same "don't fire on missing data" rule as Phase 5).

New Zod variants in `src/lib/alerts/schemas.ts`; new evaluators in
`src/lib/alerts/evaluators.ts` / a small `ipoAlerts.ts`; `ipo_watch`
stored/managed via `src/lib/alerts/store.ts` (or a thin `ipoWatch.ts`).

### 4. Surfaces (Next.js)

- **`/dashboard/ipos`** — sections **Open now** / **Upcoming** /
  **Recently listed**. Each row: name + Mainboard/SME badge, the relevant
  dates, price band, lot size, issue size, subscription ×, and **GMP with
  its caveat inline**. A "Notify me about IPOs" control in the page header
  drives the `ipo_watch` subscription (trigger checkboxes + mainboard-only
  toggle). Each row has a "Set alert" affordance for a per-IPO alert.
  `src/lib/dashboard/iposApi.ts` client + a thin `/api/ipos` proxy if the
  list needs client-side filtering (otherwise Server-Component reads).
- **Dashboard-home widget** — a compact "IPOs open now" card on
  `/dashboard`, linking to the full page.
- **Nav:** "IPOs" added to the desktop `AppHeader` nav. The mobile
  `MobileTabBar` is already at 5 tabs — IPOs is **not** added there; mobile
  reaches it via the dashboard widget and a link. (Revisit if a "More"
  tab is ever added.)
- Built against `/docs/design-system.md` + `--app-*` tokens.

### 5. Explicitly out of Phase 7 v1

- GMP history / charts (only the latest value is stored).
- Buybacks, rights issues, NFOs — IPOs only.
- Broker-wise / category-wise subscription breakdown (one blended
  `subscription_times`).
- "Apply via <broker>" deep links.
- Email delivery (Phase 5's deferred stub applies here too).
- A second GMP source / cross-checking between trackers.

## Consequences

- `fundamentals-api` gains an isolated IPO/GMP scraper (swappable, like
  the Screener one) and one Postgres table + migration. `nsepython`
  already covers the Tier 1 attempt; no new Python deps expected beyond
  what Tier 3 scraping already uses (`scrapling` / `httpx` / `lxml`).
- The alerts engine stays single-loop / single-delivery-path — IPO alerts
  are two more discriminated-union variants and one more branch in
  `evaluateAlerts()`, not a parallel system. Phase 8 still layers on the
  same `deliverNotification`.
- **GMP is a deliberately fragile, deliberately caveated dependency.** It
  can break or vanish without notice; the UI must degrade to "GMP
  unavailable" and alerts on it must skip, never fire wrong. Kept in one
  isolated module so swapping the source is a contained change.
- The **ToS review of the chosen aggregator is a hard gate** before the
  scraper is written — recorded in `/docs/data-sources.md`, resolved not
  deferred.
- Deployment-mode gate: IPO data is public — no `isHosted()` gating; the
  `ipo_watch` / per-IPO alerts use whatever `getCurrentUserId()` resolves,
  same as Phase 5.

## Amendment (2026-09-06): ToS gate resolved — accept the trade-off

The gate ran before any build. Findings on **Chittorgarh** (the lead
aggregator):

- Terms: *"no user may distribute, modify, transmit, or use the contents
  in any manner for public or commercial purposes without prior written
  permission"* (Disclaimer & Privacy Statement,
  `chittorgarh.com/article/disclaimer-and-privacy-statement/238/`).
- The site actively blocks non-browser clients — an automated GET of its
  own disclaimer page returns `403`.

InvestorGain / IPO Watch were taken to be equivalent (GMP data is these
sites' core product; none will license redistribution).

**Decision (user): accept the trade-off**, on the same terms as
Screener.in in [ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md):

- The scraper lives in **one isolated, swappable module**
  (`app/ingestion/tier3_ipo_scraper/`) with its own README noting this
  finding, so changing or removing the source is a contained edit.
- GMP is surfaced **only** with the caveat "unofficial estimate from
  grey-market dealers, compiled by a third-party tracker — not from any
  exchange, not a prediction", and degrades to "GMP unavailable" the
  moment the scrape fails. Alerts on GMP skip rather than fire on missing
  data.
- Polite request pacing (reuse `app/ingestion/rate_limit.py`), a real
  browser-like `User-Agent`, and a wide cache TTL so the site is hit
  rarely.
- `/docs/data-sources.md` records the finding verbatim, dated, as an
  accepted known risk — not presented as a sanctioned integration.

This does bend `ROADMAP.md`'s "scraping never enters production" standing
rule a second time (Phase 4 bent it for Screener). That rule is now
effectively "scraping is Tier-3 last-resort, isolated, and honestly
labelled" in practice — noted here rather than silently.
