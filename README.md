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
| Auth      | Clerk                                                           | [ADR 0005](docs/decisions/0005-clerk-auth.md)                      |
| Database  | MongoDB Atlas, native driver (no Mongoose)                      | [ADR 0007](docs/decisions/0007-mongodb-native-driver.md)           |
| Hosting   | Vercel                                                          | [ADR 0006](docs/decisions/0006-vercel-mongodb-atlas-deployment.md) |

## Getting started

### Prerequisites

- Node.js 20+
- A [Clerk](https://clerk.com) application (for auth)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or any MongoDB instance)

### Local setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` with your own values:

```
MONGODB_URI=          # MongoDB Atlas connection string
MONGODB_DB=marketmitra
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

(`.env.local` is gitignored — never commit real credentials. `.env.local.example` documents every required variable with no values.)

```bash
npm run dev
```

The app runs at `http://localhost:3000`. `/` is the public landing page; `/dashboard` requires signing in.

### Other scripts

```bash
npm run build    # production build
npm run lint      # ESLint
npm run format    # Prettier
```

### Deploying

The project deploys to Vercel with MongoDB Atlas as the database — no other infrastructure required. Set the same environment variables from `.env.local.example` in the Vercel project settings.

## Two ways to run it

Per [ADR 0008](docs/decisions/0008-hosted-vs-self-hosted-distribution.md): a paid hosted option (7-day free trial) for people who want it running with no setup, or a free, self-hosted option (MIT licensed) where you bring your own MongoDB Atlas cluster, Clerk application, and AI provider key. Same codebase either way — self-hosting isn't a stripped-down version.

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
