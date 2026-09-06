# 0014: Alerts engine — Phase 5 scope, delivery model, and evaluation architecture

Date: 2026-09-06
Status: accepted (scoping decision — no code written yet)

## Context

Phase 5 in `ROADMAP.md` was a one-line placeholder marked ❓ ("delivery
channels beyond email, exact trigger logic, how alerts relate to the
Phase 4 data API vs. live price feeds"). This ADR is the output of the
dedicated scoping session that placeholder required. It fixes scope and
architecture for a v1 alerts feature; the build checklist lives in
`ROADMAP.md` under Phase 5.

Relevant existing state the design has to fit:

- **No scheduling infrastructure exists** anywhere in the repo — no root
  `vercel.json`, no cron routes, no background workers.
- **No email infrastructure** — no provider, no `nodemailer`/Resend, no
  from-domain. Hosted mode has Clerk user email addresses; self-host mode
  (ADR 0010) has a single fixed `"local"` user and no email identity.
- **No live/intraday quote endpoint.** `services/fundamentals-api` serves
  end-of-day price history (`GET /companies/{symbol}/prices`) and live
  index quotes (`GET /indices`). The dashboard's "movers" derive a
  day-change from the last two daily closes (`src/lib/dashboard/quotes.ts`)
  — there is no lightweight "current price for these N symbols" call.
- **Holdings** live in MongoDB (`holdings` collection, ADR 0012), per-user
  via `src/lib/currentUserId.ts` (real Clerk id hosted / `"local"`
  self-host).
- **Deployment-mode gate** (`isHosted()`, ADR 0010) governs every
  auth/billing mount point; a new feature must work in both modes.

Phases 7 (IPO/GMP alerts) and 8 (AI insights) both expect to reuse a
notification-delivery pipeline. This ADR therefore designs delivery as a
**generic notification subsystem**, not an alerts-only mechanism.

## Decisions

### 1. v1 alert trigger types (all four, one shared evaluator)

Confirmed in the scoping session — v1 ships all four:

| Type | Condition | Reference data |
| --- | --- | --- |
| **Price threshold** | Last price rises to ≥ X (target) or falls to ≤ X (stop-loss) — one mechanism with a `direction` field | live quote |
| **Percent move** | Intraday move from previous close crosses ±X% | live quote + prev close |
| **52-week high/low breach** | New 52-week high/low, or within X% of one | 52w high/low + live quote |
| **Portfolio / holding P&L** | Total portfolio value, or a named holding's unrealized P&L, crosses a set level | user's holdings (MongoDB) + live quotes |

Target-price and stop-loss are **not** separate types — they are a price
threshold with `direction: "above" | "below"`. The first three operate on
any NSE symbol the fundamentals-api recognizes; the fourth joins the
user's holdings.

All four are evaluated by one pure function per type (`evaluate*`), taking
(alert config, current market snapshot) and returning
`{ triggered: boolean, observedValue }`. No I/O inside the evaluators —
makes them table-testable offline, same discipline as the fundamentals-api
ingestion tests.

### 2. Delivery: a generic notification subsystem, in-app baseline + config-gated channels

- **In-app notification center is the always-on baseline.** New MongoDB
  `notifications` collection: `{ _id, userId, kind, title, body, href,
  read, createdAt, meta }`. A bell/inbox in the dashboard app shell
  (`AppHeader`) shows the unread count and a dropdown list. Works
  identically in hosted and self-host — no external dependency.
- **Email** is an opt-in channel, gated on the presence of an email
  provider config (env var), **not** on `isHosted()`. Hosted deployments
  set it and use Clerk's stored email as the destination; self-host
  operators who set it supply their own destination address in config.
  Provider will be provisioned through the Vercel Marketplace (Resend is
  the expected pick) — see "Open dependencies" below; this ADR does not
  hardcode the provider SDK.
- **Webhook** (generic HTTP `POST` of the notification payload) is a
  second opt-in channel — low build cost, covers Telegram/Discord/Slack
  incoming webhooks, and is the natural fit for self-hosters who don't
  want to configure email. Per-alert optional `webhookUrl`, or a global
  `ALERT_WEBHOOK_URL`.
- **Browser/Web Push is out of v1 scope** — deferred; the client plumbing
  and permission UX aren't worth it for the first cut.

Delivery is a single `deliverNotification(userId, payload, channels)`
function that always writes the in-app record and then fans out to
whichever external channels are configured. Phases 7 and 8 call this same
function with a different `kind`.

### 3. Evaluation: Vercel Cron every ~10 min during IST market hours, via a secret-guarded API route

- A new **root `vercel.json`** declares a cron hitting
  `POST /api/cron/evaluate-alerts` roughly every 10 minutes across the UTC
  window that covers NSE hours (`*/10 3-10 * * 1-5` — 09:15–15:30 IST is
  ~03:45–10:00 UTC, Mon–Fri). This is the repo's first cron; the root
  `vercel.json` is otherwise minimal.
- The **route itself does the precise gate**: it no-ops unless the current
  time is within NSE trading hours in `Asia/Kolkata`, plus one sweep
  shortly after close. NSE trading-holiday awareness is **out of v1
  scope** — on a holiday the market simply doesn't move, so evaluators
  won't fire; revisit only if false-positives show up in practice.
- The route is guarded by a `CRON_SECRET` bearer check (Vercel injects
  this header for platform crons). Because the guard is a shared secret
  and not Vercel-specific, **self-hosters on other platforms trigger the
  same route** from their own scheduler (`curl -H "Authorization: Bearer
  $CRON_SECRET" .../api/cron/evaluate-alerts`) — documented in the
  self-host README. This keeps the feature portable despite Vercel Cron
  being Vercel-only.
- Per cycle the route: loads all `active` alerts, collects the distinct
  set of symbols they reference, fetches one batched quote snapshot,
  loads holdings only if a portfolio alert exists, runs the evaluators,
  and for each newly-triggered alert calls `deliverNotification` and
  transitions the alert.
- **Graceful degradation is mandatory.** If the quote fetch fails or
  returns partial data (the yfinance/NSE sources are unofficial and
  occasionally blocked — ADR 0011), the cycle skips affected symbols and
  logs; it never fires or auto-resolves an alert on missing/stale data.

### 4. New fundamentals-api endpoint: batched live quote

`GET /quote?symbols=A,B,C` on `services/fundamentals-api`, returning per
symbol `{ symbol, price, prevClose, changePct, week52High, week52Low,
asOf, source_tier }`. Backed by yfinance fast-quote / 1-minute data
(already an accepted Tier-2 source in ADR 0011 and `data-sources.md` — no
new source, so no new ToS review; the entry gets an "also used for live
quotes" note). Short in-process cache (~60 s) so multiple alert cycles and
the dashboard can share it. This is the one new piece of backend data
plumbing Phase 5 needs; everything else is main-app work.

The 52-week high/low fields live on this endpoint (not a separate call) so
the breach evaluator needs exactly one fetch.

### 5. Alert lifecycle

MongoDB `alerts` collection: `{ _id, userId, type, symbol | scope, params
(threshold/direction/pct/margin), status: "active" | "triggered" |
"paused", rearm: boolean, cooldownMinutes, lastEvaluatedAt, triggeredAt,
lastObservedValue, createdAt, updatedAt }`.

- **One-shot by default:** on trigger, `status → "triggered"` and the
  alert stops evaluating until the user re-activates it. An optional
  `rearm` flag (sensible for percent-move alerts) keeps it `active` but
  applies a **cooldown** and **hysteresis** — the observed value must
  cross back past the threshold by a margin before it can fire again — so
  a price hovering on the line doesn't send repeat notifications.
- Users can pause/resume and edit thresholds without deleting.
- `userId` uses the existing `currentUserId.ts` split (Clerk id hosted /
  `"local"` self-host), same as holdings.

### 6. API surface (new, all documented in `/docs/api-surface.md`)

Main app (Next.js route handlers, per ADR 0004):

- `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/[id]` — CRUD, Zod-
  validated, Clerk-session-scoped (or `"local"`).
- `GET /api/notifications`, `POST /api/notifications/read` — list + mark
  read/all-read.
- `POST /api/cron/evaluate-alerts` — `CRON_SECRET`-guarded, not session
  auth; the evaluation entry point.

fundamentals-api: `GET /quote?symbols=` (documented in that service's
README + `data-sources.md` note).

### 7. UI

- New `/dashboard/alerts` route inside the existing app shell — list /
  create / edit / pause / delete alerts. Add "Alerts" to the shell nav
  (currently Dashboard / Portfolio / Markets / Insights).
- "Set alert" affordance on `/dashboard/stock/[ticker]`, prefilled with
  that symbol.
- Notification bell + dropdown in `AppHeader` (and a reachable equivalent
  in the mobile header/tab bar), with an unread badge.
- Built against `/docs/design-system.md` and the `--app-*` token subset,
  reusing existing table/card/pill components.

## Consequences

- The repo gains its **first scheduled job** and its **first outbound
  email path**. Both are introduced narrowly and behind config; neither
  changes existing behavior when unconfigured (in-app notifications still
  work).
- `services/fundamentals-api` gains a live-quote endpoint it didn't have —
  a small, bounded addition, but it does mean the service is now hit on a
  10-minute cron cadence in hosted mode. Mitigated by the batched request
  (only symbols with active alerts) and the 60 s cache.
- **Self-host keeps full parity** with hosted (ADR 0010 principle): the
  alert engine, in-app notifications, and — if the operator sets env vars
  — email/webhook all work. The only self-host caveat is that the operator
  must arrange to call the cron route themselves if not on Vercel;
  documented, not a silent gap.
- Delivery is deliberately generic so **Phase 7 (IPO/GMP alerts)** reuses
  `deliverNotification` + the notification center + the cron-route pattern
  rather than rebuilding them. Phase 8 can surface AI insights through the
  same in-app channel.
- **Explicitly deferred (not in v1):** browser/Web Push; NSE trading-
  holiday calendar awareness; SMS; per-user quiet hours; digest/batched
  notifications; alert history/analytics beyond the raw notification list.
- **Open dependencies before/into the build:**
  1. Email provider must be provisioned via the Vercel Marketplace
     (`marketplace` skill), and a from-address/domain decided — the
     `marketmitra-v2.vercel.app` domain may need a verified sending domain
     or the provider's onboarding subdomain. This is a user-in-the-loop
     step, not something to hardcode ahead of time.
  2. `CRON_SECRET` env var added to the Vercel project (and documented for
     self-host).
  3. Confirm the Vercel plan's cron limits (frequency/count) are
     compatible with a 10-minute business-hours schedule.

## Amendment (2026-09-06): email deferred to a follow-up; webhook is v1's external channel

After the build, `vercel integration discover --category messaging` surfaced
exactly one option — Resend (`resend/resend-email`). Provisioning it would
add a third-party integration to the Vercel account and needs a browser step
to verify a sending domain (a `.vercel.app` subdomain can't be verified in
Resend, so it would mean either sending from `resend.dev` or standing up a
custom domain). The project has been deliberate about not adding third-party
accounts without a dedicated decision (cf. ADR 0013).

Decision: **ship v1 with in-app + webhook only.** Webhook already covers
every "notify me somewhere else" case (Telegram/Discord/Slack incoming
webhooks, or email via a relay). Email stays a clean, config-gated seam:
`emailConfigured()` (`RESEND_API_KEY` present) + `sendEmail()` in
`src/lib/notifications/channels.ts`, which today returns `status: 'skipped'`.
Wiring it later is a self-contained follow-up — `npm install resend`,
implement the seam, add a template, one live test — with no refactor to the
rest of the engine. Tracked in ROADMAP.md, not blocking Phase 5 sign-off.

## Amendment (2026-09-06): deployed — Vercel cron is daily-only on the Hobby plan

§3 assumed a `*/10 3-10 * * 1-5` Vercel Cron. On deploy this failed hard:
**Hobby accounts allow only one cron run per day.** The account is Hobby and
MarketMitra has no paid tier, so upgrading isn't the answer.

Shipped compromise: `vercel.json` now declares `0 4 * * *` (once daily,
04:00 UTC ≈ 09:30 IST, just after market open — the route's `isNseSession`
gate still no-ops it on weekends/holidays). That's a floor, not a real
cadence for stop-loss/target alerts.

The route itself is unchanged and is the real workhorse:
`GET|POST /api/cron/evaluate-alerts`, `CRON_SECRET`-guarded, callable by
anyone with the token at any frequency. Proper ~10-minute cadence comes from
pointing an external scheduler at it — cron-job.org, a home server's
crontab, or a GitHub Actions schedule (the last needs v2 merged to `main`,
since scheduled workflows only run from the default branch). The README's
"Alerts evaluation (cron)" section carries the recipe. Verified live in
production after deploy: `/quote` serves real data, and the cron route
returns `{ran:true, activeAlerts:0, errors:0}` with the token / `401`
without it.

Also on this deploy: bumped `@types/node` `^20 → ^24` (Vercel builds on
Node 24 anyway) so `npm install` resolves without `--legacy-peer-deps` —
the `vitest`/`vite` devDeps added for the alert tests need `@types/node`
`>=24` as an optional peer, and Vercel's install is strict.
