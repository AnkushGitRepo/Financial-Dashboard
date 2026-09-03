# Architecture

Current system architecture for MarketMitra v2. Kept in sync with reality — when a feature ships, its detailed build notes move to `/docs/archive/<feature-name>.md` and only a short summary stays here (see the context maintenance protocol in `/CLAUDE.md`).

## Status: Phase 2 (scaffold) complete

v2 is a teardown-and-rebuild of the v1 Financial-Dashboard repo (see [ADR 0001](./decisions/0001-teardown-and-rebuild.md)). Phase 2 scaffold is live in production (blank shell, auth wired, DB connected). Phase 3 (real landing + dashboard content) is next.

## Stack

- **Framework:** Next.js 16, App Router, TypeScript, `src/` directory ([ADR 0002](./decisions/0002-nextjs-app-router.md))
- **Styling:** CSS Modules + `src/styles/tokens.css` design tokens, no CSS framework ([ADR 0003](./decisions/0003-css-modules-no-framework.md))
- **Backend:** Next.js API route handlers under `src/app/api/**/route.ts`, no separate server ([ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md))
- **Auth:** Clerk v7 ([ADR 0005](./decisions/0005-clerk-auth.md))
- **Database:** MongoDB Atlas via native driver, cached connection helper at `src/lib/mongodb.ts` ([ADR 0007](./decisions/0007-mongodb-native-driver.md))
- **Hosting:** Vercel ([ADR 0006](./decisions/0006-vercel-mongodb-atlas-deployment.md))

> **Note (Next.js 16):** the middleware file convention is renamed to `proxy.ts` (`src/proxy.ts` here) — same API, new filename. Clerk v7 ("Core 3") removed `<SignedIn>`/`<SignedOut>`/`<Protect>` in favor of a single `<Show when="signed-in" | "signed-out">` component. Both surprised the scaffold build — noted here so a future session doesn't relitigate them from stale training data.

## Route structure

| Route | Purpose | Auth |
|---|---|---|
| `/` | Landing (placeholder content — Phase 3 fills this in) | public |
| `/sign-in/[[...sign-in]]` | Clerk hosted sign-in | public |
| `/sign-up/[[...sign-up]]` | Clerk hosted sign-up | public |
| `/dashboard` | Post-auth shell (empty state — Phase 3 fills this in) | protected, enforced in `src/proxy.ts` |

`src/proxy.ts` runs `clerkMiddleware`, protects `/dashboard(.*)`, and redirects unauthenticated visitors to `/sign-in?redirect_url=...`. Verified end-to-end in production.

## Data flow

_To be filled in once the first data-backed feature ships._

## Shipped features (see `/docs/archive/` for detail)

_None yet._
