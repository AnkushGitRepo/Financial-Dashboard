# MarketMitra

A financial dashboard for Indian markets — one place to see your holdings, prices, and what moved your money. Open source, self-hostable, with a hosted option for people who'd rather not run their own infrastructure.

This is **v2**: a full teardown-and-rebuild of the original Financial-Dashboard project, not an incremental update. See [ADR 0001](docs/decisions/0001-teardown-and-rebuild.md) for why.

## What changed from v1

v1 was a split-stack MERN app: a React+Vite client, a separate Express server, a separate Django API for financial data/sentiment, a standalone Python scraper, hand-rolled OTP-based authentication, and two separate deploy targets (Render + Vercel).

v2 consolidates all of that into a single Next.js (App Router, TypeScript) application:

- **One runtime, one language.** No more juggling Node/Express, Django, and Python scraper scripts as separate services — see [ADR 0002](docs/decisions/0002-nextjs-app-router.md) and [ADR 0004](docs/decisions/0004-nextjs-api-routes-as-backend.md).
- **Clerk instead of hand-rolled auth.** No more custom OTP/email/SMS verification code — see [ADR 0005](docs/decisions/0005-clerk-auth.md).
- **Built for two consumers from day one: a human dashboard and an AI agent.** Every feature ships a UI path and a documented, stable API endpoint together (see `/docs/api-surface.md`) — not a UI with an API bolted on afterward, and not an API with no UI.
- **One deploy target.** Vercel + MongoDB Atlas, nothing else — see [ADR 0006](docs/decisions/0006-vercel-mongodb-atlas-deployment.md).

This is a fresh rebuild. No code, features, or data carried over automatically from v1 — anything from the old app (IPO calendar, market indices, news sentiment) has to be rebuilt deliberately if and when it's re-added. v1's code is still reachable in this repo's git history if an old implementation detail is worth referencing.

## Status

Landing page and the post-auth dashboard shell (empty state — no data features wired up yet) are built. No financial-data features have shipped yet in v2. This is a real, current snapshot, not a roadmap — check `/docs/session-log.md` for what's actually landed most recently.

## Stack

| Layer     | Choice                                                          | Why                                                                |
| --------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| Framework | Next.js (App Router, TypeScript)                                | [ADR 0002](docs/decisions/0002-nextjs-app-router.md)               |
| Styling   | CSS Modules + a shared design-token file, no Tailwind/Bootstrap | [ADR 0003](docs/decisions/0003-css-modules-no-framework.md)        |
| Backend   | Next.js API route handlers (no separate server)                 | [ADR 0004](docs/decisions/0004-nextjs-api-routes-as-backend.md)    |
| Auth      | Clerk, active only in hosted mode                               | [ADR 0005](docs/decisions/0005-clerk-auth.md), [ADR 0010](docs/decisions/0010-deployment-mode-gate.md) |
| Database  | MongoDB Atlas, native driver (no Mongoose)                      | [ADR 0007](docs/decisions/0007-mongodb-native-driver.md)           |
| Hosting   | Vercel                                                          | [ADR 0006](docs/decisions/0006-vercel-mongodb-atlas-deployment.md) |

## Getting started

### Prerequisites

- Node.js 20+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or any MongoDB instance)
- **Self-hosting (the default):** that's it. No Clerk account, no billing keys.
- **Running in hosted mode:** also requires a [Clerk](https://clerk.com) application — only relevant to MarketMitra's own paid deployment, not to self-hosting.

### Local setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` with your own values:

```
MONGODB_URI=          # MongoDB Atlas connection string
MONGODB_DB=marketmitra
```

`NEXT_PUBLIC_DEPLOYMENT_MODE` defaults to `selfhost` when left unset — the app runs with no login screen and no billing UI, straight into the dashboard as a single local user. Self-hosted users don't need to configure Clerk or any billing keys at all; those variables in `.env.local.example` only matter when `NEXT_PUBLIC_DEPLOYMENT_MODE=hosted`. See [ADR 0010](docs/decisions/0010-deployment-mode-gate.md).

(`.env.local` is gitignored — never commit real credentials. `.env.local.example` documents every required variable with no values.)

```bash
npm run dev
```

The app runs at `http://localhost:3000`. `/` is the public landing page. `/dashboard` is open directly in self-host mode (the default); in hosted mode it requires signing in.

### Other scripts

```bash
npm run build    # production build
npm run lint      # ESLint
npm run test      # Vitest unit tests
npm run format    # Prettier
```

### Deploying

The project deploys to Vercel with MongoDB Atlas as the database — no other infrastructure required. Set the same environment variables from `.env.local.example` in the Vercel project settings.

### Alerts evaluation (cron)

Price and portfolio alerts are checked by a scheduled call to `POST /api/cron/evaluate-alerts` (see [ADR 0014](docs/decisions/0014-alerts-engine-scope.md)). The route is guarded by a `CRON_SECRET` — set it in the environment; callers pass it as `Authorization: Bearer <CRON_SECRET>`.

`vercel.json` declares a **once-daily** cron (`0 4 * * *`, ~09:30 IST) — that's all the Vercel Hobby plan allows. For a useful cadence, point an external scheduler at the same URL with the same header:

```bash
# e.g. a system crontab entry, every 10 minutes on weekday market hours (UTC ≈ IST-5:30)
*/10 3-10 * * 1-5  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/evaluate-alerts
```

A GitHub Actions workflow for this ships at `.github/workflows/evaluate-alerts.yml` (every 10 min during market hours) — activate it by adding the `CRON_SECRET` repo secret and making this the default branch (GitHub only runs `schedule:` from the default branch; the manual "Run workflow" button works from any branch). cron-job.org or a home server's crontab work too. The route only does work during NSE trading hours (it no-ops otherwise); add `?force=1` to run a cycle regardless. In-app notifications work with no extra setup. Set `ALERT_WEBHOOK_URL` (or a per-alert URL) to also forward alerts to a Telegram/Discord/Slack incoming webhook. Email delivery is a config-gated seam that isn't wired to a provider yet — see ROADMAP.md.

### MCP server + API

The public market data (symbol search, quotes, fundamentals, price history, news, IPOs, indices) is exposed as an **MCP server** for AI agents at `/api/mcp` (Streamable HTTP — client config `{ "url": "https://your-host/api/mcp" }`). It wraps the same data the dashboard uses; see [`/docs/api-surface.md`](docs/api-surface.md) for the tool list and [`/llms.txt`](public/llms.txt) for an agent-readable pointer. All tools are read-only public data — no auth. See [ADR 0019](docs/decisions/0019-phase-9-api-surface-mcp-rate-limiting.md).

**Rate limiting** (hosted only): set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (provision with `vercel integration add upstash/upstash-kv`) to enforce fair-use limits on `/api/*` and `/api/mcp`. With both unset the limiter is a no-op — **self-host is never throttled**.

## Two ways to run it

Per [ADR 0008](docs/decisions/0008-hosted-vs-self-hosted-distribution.md): a paid hosted option (7-day free trial) for people who want it running with no setup, or a free, self-hosted option (MIT licensed) where you bring your own MongoDB Atlas cluster and AI provider key. Same codebase either way — self-hosting isn't a stripped-down version.

A single `DEPLOYMENT_MODE` environment variable gates which one you get at runtime ([ADR 0010](docs/decisions/0010-deployment-mode-gate.md)): unset or `selfhost` skips auth and billing UI entirely (single local user, no login); `hosted` — MarketMitra's own deployment only — turns both on via Clerk. Self-host login is intentionally left as a future decision, not a finished feature.

## Project context, for humans and agents

This repo is built to be picked up cold by a fresh session — human or AI agent — without re-deriving context from scratch:

- **[`CLAUDE.md`](CLAUDE.md)** — entry point: current phase, stack constraints, pointers to everything below.
- **[`/docs/architecture.md`](docs/architecture.md)** — current system architecture: routes, component structure, data flow.
- **[`/docs/design-system.md`](docs/design-system.md)** — colors, type scale, spacing, component patterns. Every page is built against this.
- **[`/docs/decisions/`](docs/decisions/)** — ADRs, one per real decision, numbered, never pruned.
- **[`/docs/data-sources.md`](docs/data-sources.md)** — every external API/scraper this project depends on: endpoint, auth, rate limits, cost, ToS notes.
- **[`/docs/api-surface.md`](docs/api-surface.md)** — the public API surface, documented for both the dashboard UI and AI agent consumers.
- **[`/docs/session-log.md`](docs/session-log.md)** — rolling log of what actually happened, session by session.

No usage numbers, adoption stats, or "battle-tested" claims appear anywhere in this repo. It's a fresh rebuild — if a claim like that shows up somewhere, it's a bug, not a feature.

## License

MIT — see [`LICENSE`](LICENSE) ([ADR 0009](docs/decisions/0009-mit-license.md)).
