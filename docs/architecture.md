# Architecture

Current system architecture for MarketMitra v2. Kept in sync with reality — when a feature ships, its detailed build notes move to `/docs/archive/<feature-name>.md` and only a short summary stays here (see the context maintenance protocol in `/CLAUDE.md`).

## Status: Phase 3 in progress — landing page built, awaiting approval

v2 is a teardown-and-rebuild of the v1 Financial-Dashboard repo (see [ADR 0001](./decisions/0001-teardown-and-rebuild.md)). Phase 2 scaffold is live in production. The real landing page (`/`) is now built against an approved design export and deployed to `src/app/page.tsx`; the dashboard route (`/dashboard`) is still the Phase 2 empty-state placeholder. Distribution/pricing model is set ([ADR 0008](./decisions/0008-hosted-vs-self-hosted-distribution.md)).

## Stack

- **Framework:** Next.js 16, App Router, TypeScript, `src/` directory ([ADR 0002](./decisions/0002-nextjs-app-router.md))
- **Styling:** CSS Modules + `src/styles/tokens.css` design tokens, no CSS framework ([ADR 0003](./decisions/0003-css-modules-no-framework.md))
- **Backend:** Next.js API route handlers under `src/app/api/**/route.ts`, no separate server ([ADR 0004](./decisions/0004-nextjs-api-routes-as-backend.md))
- **Auth:** Clerk v7 ([ADR 0005](./decisions/0005-clerk-auth.md))
- **Database:** MongoDB Atlas via native driver, cached connection helper at `src/lib/mongodb.ts` ([ADR 0007](./decisions/0007-mongodb-native-driver.md))
- **Hosting:** Vercel ([ADR 0006](./decisions/0006-vercel-mongodb-atlas-deployment.md))

> **Note (Next.js 16):** the middleware file convention is renamed to `proxy.ts` (`src/proxy.ts` here) — same API, new filename. Clerk v7 ("Core 3") removed `<SignedIn>`/`<SignedOut>`/`<Protect>` in favor of a single `<Show when="signed-in" | "signed-out">` component. Both surprised the scaffold build — noted here so a future session doesn't relitigate them from stale training data.

## Route structure

| Route                     | Purpose                                                          | Auth                                  |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| `/`                       | Landing page — full marketing content, live                      | public                                |
| `/sign-in/[[...sign-in]]` | Clerk hosted sign-in                                             | public                                |
| `/sign-up/[[...sign-up]]` | Clerk hosted sign-up                                             | public                                |
| `/dashboard`              | Post-auth shell (empty state — real dashboard UI still Phase 4+) | protected, enforced in `src/proxy.ts` |

`src/proxy.ts` runs `clerkMiddleware`, protects `/dashboard(.*)`, and redirects unauthenticated visitors to `/sign-in?redirect_url=...`. Verified end-to-end in production.

## Landing page (`/`) — component structure

Built from an approved Claude Design export (`MarketMitra Landing.dc.html`) reimplemented natively — the `.dc.html` runtime (`support.js`, `x-dc`/`sc-for`/`sc-if` templating) was not ported, only the visual design and copy.

All components live in `src/components/landing/`, each with a co-located `.module.css`:

| Component                                              | Notes                                                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Logo`                                                 | Shared SVG mark + wordmark; `animated` prop plays a draw-in keyframe on mount (navbar only)                                                                              |
| `Navbar`                                               | Sticky pill nav; scroll-triggered shadow/background (client, scroll listener); mobile hamburger panel; auth-aware CTA via Clerk `<Show>` (Get Started vs Dashboard link) |
| `Hero`                                                 | Headline/subhead/CTA, CSS fade+up on load                                                                                                                                |
| `DashboardPreview`                                     | Mocked portfolio dashboard (candlestick chart, tabs, activity feed) — illustrative demo data, not live; client component for tab/range state                             |
| `FeaturesGrid`                                         | 4 feature cards, scroll-triggered stagger reveal (Framer Motion), hover lift on pointer devices                                                                          |
| `HowItWorks`                                           | 4-step numbered card, staggered reveal                                                                                                                                   |
| `OpenSourceSection`                                    | Dark gradient panel; GitHub stars/contributors/release intentionally show `—` (no API wired yet) rather than invented numbers                                            |
| `PricingCards`                                         | Hosted vs self-hosted tiers per [ADR 0008](./decisions/0008-hosted-vs-self-hosted-distribution.md)                                                                       |
| `FAQAccordion`                                         | Single-open accordion, CSS `grid-template-rows` 0fr→1fr expand (client)                                                                                                  |
| `Footer`                                               | 5-column nav, stacks on mobile; copyright year computed at render, not hardcoded                                                                                         |
| `Reveal` / `RevealGroup` / `RevealItem` (`Reveal.tsx`) | Shared Framer Motion scroll-reveal wrappers; respect `prefers-reduced-motion` via `useReducedMotion()`                                                                   |

Page composition: `src/app/page.tsx` assembles `Navbar → Hero → DashboardPreview` inside a shared gradient "hero band" wrapper, followed by `FeaturesGrid → HowItWorks → OpenSourceSection → PricingCards → FAQAccordion → Footer` (`src/app/page.module.css` holds the page-level background gradients).

Design tokens (`src/styles/tokens.css`) were fully overhauled from the Phase 2 placeholder dark theme to the approved design's warm/cream light palette; fonts are Manrope + JetBrains Mono via `next/font/google`, wired in `src/app/layout.tsx`.

**Full design system reference: [`/docs/design-system.md`](./design-system.md)** — colors, type scale, spacing, component patterns. Build every new page against that doc, not against whichever page was built most recently.

## Auth pages (`/sign-in`, `/sign-up`) — component structure

Restyled to match the design system (previously plain default Clerk widgets on the Phase 2 dark placeholder theme). Split layout, left/right, via `src/components/auth/`:

| Component | Notes |
| --- | --- |
| `AuthLayout` | Two-column shell: left = logo + heading + Clerk form slot + switch-account link + back-to-home link; right = `FeatureCarousel`. Right column hidden below 968px (`AuthLayout.module.css`). |
| `FeatureCarousel` | Auto-advancing (5s), pausable on hover, dot-navigable carousel reusing the landing page's 4 feature messages with small on-brand mock visuals (portfolio stat rows, a price/chart strip, a dark insight card, a tool-chip row) — no stock photography, no fabricated testimonials. Crossfade via Framer Motion `AnimatePresence`, `useReducedMotion()`-gated. |
| `clerkAppearance.ts` | Shared Clerk `appearance` config: `variables` map Clerk's theme vars to our CSS custom properties (color, radius, font); `elements.header`/`elements.footer` are hidden — the page renders its own heading and switch-account link instead, styled with our type scale. |

**Clerk branding note:** hiding the "Secured by Clerk" footer via `elements.footer` is a supported appearance option, not a documented guarantee for every Clerk plan tier — flagged to the user as a ToS consideration worth checking against Clerk's current terms for this account's plan, not something to treat as unconditionally safe.

## Data flow

_To be filled in once the first data-backed feature ships. The DashboardPreview on the landing page is static mock data for illustration only — not connected to any backend._

## Shipped features (see `/docs/archive/` for detail)

_None yet._
