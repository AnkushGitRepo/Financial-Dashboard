# Architecture

Current system architecture for MarketMitra v2. Kept in sync with reality — when a feature ships, its detailed build notes move to `/docs/archive/<feature-name>.md` and only a short summary stays here (see the context maintenance protocol in `/CLAUDE.md`).

## Status: Phase 4 starting — market indices/prices is the first feature

v2 is a teardown-and-rebuild of the v1 Financial-Dashboard repo (see [ADR 0001](./decisions/0001-teardown-and-rebuild.md)). Phase 2 scaffold is live in production. Phase 3 shipped: landing page, dashboard shell, and on-brand auth pages (see "Shipped features" below). Distribution/pricing model is set ([ADR 0008](./decisions/0008-hosted-vs-self-hosted-distribution.md)). Code is pushed to the `v2` branch on GitHub (not merged to `main` yet). Phase 4's first feature, per the user's explicit choice, is real market indices/prices data.

## Stack

- **Framework:** Next.js 16, App Router, TypeScript, `src/` directory ([ADR 0002](./decisions/0002-nextjs-app-router.md))
- **Styling:** CSS Modules + `src/styles/tokens.css` design tokens, no CSS framework ([ADR 0003](./decisions/0003-css-modules-no-framework.md))
- **Backend:** Next.js API route handlers under `src/app/api/**/route.ts`, no separate server ([ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md))
- **Auth:** Clerk v7 ([ADR 0005](./decisions/0005-clerk-auth.md))
- **Database:** MongoDB Atlas via native driver, cached connection helper at `src/lib/mongodb.ts` ([ADR 0007](./decisions/0007-mongodb-native-driver.md))
- **Hosting:** Vercel ([ADR 0006](./decisions/0006-vercel-mongodb-atlas-deployment.md))
- **License:** MIT ([ADR 0009](./decisions/0009-mit-license.md))

> **Note (Next.js 16):** the middleware file convention is renamed to `proxy.ts` (`src/proxy.ts` here) — same API, new filename. Clerk v7 ("Core 3") removed `<SignedIn>`/`<SignedOut>`/`<Protect>` in favor of a single `<Show when="signed-in" | "signed-out">` component. Both surprised the scaffold build — noted here so a future session doesn't relitigate them from stale training data.

## Route structure

| Route                     | Purpose                                                       | Auth                                  |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| `/`                       | Landing page — full marketing content, live                   | public                                |
| `/sign-in/[[...sign-in]]` | Clerk hosted sign-in, on-brand split layout                   | public                                |
| `/sign-up/[[...sign-up]]` | Clerk hosted sign-up, on-brand split layout                   | public                                |
| `/dashboard`              | Post-auth shell (empty state — real dashboard UI is Phase 4+) | protected, enforced in `src/proxy.ts` |

`src/proxy.ts` runs `clerkMiddleware`, protects `/dashboard(.*)`, and redirects unauthenticated visitors to `/sign-in?redirect_url=...`. Verified end-to-end in production.

**Full design system reference: [`/docs/design-system.md`](./design-system.md)** — colors, type scale, spacing, component patterns, and layout gotchas learned the hard way. Build every new page against that doc, not against whichever page was built most recently.

**Clerk branding note (open item):** hiding the "Secured by Clerk" footer via `elements.footer` is a supported appearance option, not a documented guarantee for every Clerk plan tier — flagged to the user, not yet confirmed against Clerk's current ToS for this account's plan.

## Data flow

_To be filled in once the first data-backed feature ships. The `DashboardPreview` on the landing page is static mock data for illustration only — not connected to any backend._

## Shipped features (see `/docs/archive/` for detail)

- **Landing page (`/`)** — full marketing site built from an approved design export, 10 components in `src/components/landing/`. Full detail: [`/docs/archive/landing-page.md`](./archive/landing-page.md).
- **Dashboard shell (`/dashboard`)** — sidebar-nav layout + honest empty state, no data features yet. Full detail: [`/docs/archive/dashboard-shell.md`](./archive/dashboard-shell.md).
- **Auth pages (`/sign-in`, `/sign-up`)** — on-brand split layout replacing default Clerk widgets, `src/components/auth/`. Full detail (including 3 real Clerk-styling bugs and how they were found): [`/docs/archive/auth-pages.md`](./archive/auth-pages.md).
