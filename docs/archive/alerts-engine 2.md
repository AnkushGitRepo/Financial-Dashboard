# Archive — Alerts Engine (Phase 5)

Signed off 2026-09-06. Live summary in [`/docs/architecture.md`](../architecture.md);
full rationale in [ADR 0014](../decisions/0014-alerts-engine-scope.md) (with two
2026-09-06 amendments).

## What shipped

Four trigger types — **price threshold**, **percent move**, **52-week breach**,
**portfolio P&L** — evaluated on a schedule and delivered through a generic notification
subsystem: an in-app notification center as the always-on baseline, plus config-gated
**email** and **webhook**. Full parity in both deployment modes.

## Architecture

- **Data (MongoDB, main app DB):** `alerts` + `notifications` collections.
  `src/lib/alerts/store.ts`, `src/lib/notifications/store.ts` mirror `holdings.ts`'s pattern.
  `userId` via `currentUserId.ts` (hosted user / `"local"` in self-host). The alert doc
  carries `armed` / `cooldownUntil` for the re-arm gate; `updateAlert()` resets it on
  edit/reactivate.
- **Pure logic (unit-tested, no I/O):** `src/lib/alerts/evaluators.ts` — one evaluator per
  type + `decideAlertTransition` (one-shot vs re-arm, cooldown, hysteresis).
  `src/lib/alerts/marketHours.ts` — `isNseSession`, IST via `Intl`, Mon–Fri ~09:15–15:35,
  **deliberately not holiday-aware** (ADR 0014). `src/lib/alerts/portfolioMetrics.ts` —
  whole-book + per-holding metrics, unpriced holdings excluded.
- **The cycle:** `src/lib/alerts/evaluate.ts` — load active alerts → collect symbols
  (incl. portfolio-alert users' holdings) → one batched `GET /quote` to fundamentals-api →
  evaluate → `applyAlertTransition` → `deliverNotification` for fires. **Degrades
  gracefully:** a symbol with no live quote is counted in `skippedNoData` and never fired on.
- **Delivery:** `src/lib/notifications/deliver.ts` `deliverNotification(userId, payload,
  channels)` — always writes the in-app record, then fans out. `resolveChannels()` reads
  `ALERT_WEBHOOK_URL` / `ALERT_EMAIL_TO` / Clerk email, **not** gated on `isHosted()`.
  `kind` field on the payload so Phase 7/8 reuse the subsystem.
- **Schedule:** `GET|POST /api/cron/evaluate-alerts` — `CRON_SECRET` bearer guard
  (dev-open, prod-503 when unset), `?force=1` bypasses the hours gate, outside `proxy.ts`
  auth. GET because Vercel Cron issues GET.
- **API:** `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/[id]` (Zod discriminated union
  on `type`; PATCH validates `params` against the loaded alert's type), `GET /api/notifications`
  (+ `meta.unread`), `POST /api/notifications/read` (`{id}` one / `{}`|`{all:true}` all).
  All in [`/docs/api-surface.md`](../api-surface.md).
- **UI:** `/dashboard/alerts` (`AlertsPageClient` + `AlertForm` + `alertText.ts`),
  `NotificationBell` in `AppHeader` (desktop + mobile, 60 s poll + window-focus refetch,
  unread badge, click-through marks read + navigates), an "Alerts" nav item, and a
  "Set alert" button on the stock page deep-linking `?new=1&symbol=`. `MobileTabBar`'s dead
  "Search" tab was swapped for "Alerts".

## Gotchas & decisions made mid-build

- **Vitest is the repo's first test runner for the Next.js side** — `npm test` /
  `test:watch`, `vitest.config.mts`, node env, `src/**/*.test.ts`. `@types/node` was bumped
  `^20 → ^24` so Vercel's strict `npm install` resolves the vitest/vite peer.
- **Hobby plan rejects sub-daily crons.** Intended `*/10 3-10 * * 1-5`; shipped `0 4 * * *`
  (once daily ≈ 09:30 IST, the route's session gate handles weekends). Real ~10-min cadence
  comes from an **external scheduler** on the `CRON_SECRET`-guarded route — a GitHub Actions
  workflow (`.github/workflows/evaluate-alerts.yml`) was written but is **inert until its
  secret + repo default branch are set** (GitHub runs `schedule:` only from the default
  branch). ADR 0014 amendment.
- **Email deferred to a follow-up** (ADR 0014 amendment). `discover --category messaging`
  returns only Resend, which needs a new third-party integration + a verifiable sending
  domain (`.vercel.app` can't be verified). v1 ships **in-app + webhook**; webhook covers
  every "notify me elsewhere" case. `sendEmail` in `src/lib/notifications/channels.ts`
  stays a config-gated no-throw seam reporting `status: 'skipped'` — wiring Resend later is
  `npm install resend` + the seam + a template + one live test, no engine refactor.

## Tests

**78 total** at phase end: the pure evaluators / market-hours / portfolio-maths
(`evaluators.test.ts`, `marketHours.test.ts` incl. a UTC-vs-IST calendar-day edge,
`portfolioMetrics.test.ts`), the `evaluateAlerts()` loop with mocked store/quotes/delivery
(`evaluate.test.ts` — fire, no-fire, `skippedNoData`, portfolio P&L, delivery-failure
resilience), and the alerts/notifications/cron route handlers called directly with mocked
`currentUserId`/store (full `CRON_SECRET` guard matrix, discriminated-union validation).

## Deployment (2026-09-06)

fundamentals-api redeployed with `/quote` (verified live — real RELIANCE / TCS / NIFTY 50).
`marketmitra-v2` redeployed with the daily cron + `CRON_SECRET` (Secret type). Post-deploy:
landing 200, `/api/search` regression OK, cron route 401 without token / `{ran:true,
errors:0}` with it.

## Still open at sign-off (do not block — tracked in ROADMAP)

- Activate the GitHub Actions ~10-min scheduler (`gh secret set CRON_SECRET` + make `v2`
  the repo default branch).
- Provision Resend + wire the `sendEmail` seam + template + one live send test.
- Watch **one real alert fire end-to-end** during NSE market hours.

## Explicitly out of v1 scope (ADR 0014)

Email (deferred, above), browser/Web Push, NSE trading-holiday calendar, SMS, per-user
quiet hours, digest/batched notifications, alert history/analytics beyond the notification
list.
