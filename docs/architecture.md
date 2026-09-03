# Architecture

Current system architecture for MarketMitra v2. Kept in sync with reality — when a feature ships, its detailed build notes move to `/docs/archive/<feature-name>.md` and only a short summary stays here (see the context maintenance protocol in `/CLAUDE.md`).

## Status: pre-scaffold

v2 is a teardown-and-rebuild of the v1 Financial-Dashboard repo (see [ADR 0001](./decisions/0001-teardown-and-rebuild.md)). As of this writing, no application code exists yet — this file will be filled in as Phase 2 (scaffold) and Phase 3 (pages) land.

## Stack

- **Framework:** Next.js, App Router, TypeScript ([ADR 0002](./decisions/0002-nextjs-app-router.md))
- **Styling:** CSS Modules + `styles/tokens.css` design tokens, no CSS framework ([ADR 0003](./decisions/0003-css-modules-no-framework.md))
- **Backend:** Next.js API route handlers under `app/api/**/route.ts`, no separate server ([ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md))
- **Auth:** Clerk ([ADR 0005](./decisions/0005-clerk-auth.md))
- **Database:** MongoDB Atlas
- **Hosting:** Vercel ([ADR 0006](./decisions/0006-vercel-mongodb-atlas-deployment.md))

## Route structure

_To be filled in once Phase 2/3 scaffolding lands._

## Data flow

_To be filled in once the first data-backed feature ships._

## Shipped features (see `/docs/archive/` for detail)

_None yet._
