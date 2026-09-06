# Landing page (`/`) — archived detail

Shipped 2026-09-03. Summary lives in `/docs/architecture.md` under "Shipped features"; this file is the full detail for whoever next touches this page.

## Provenance

Built from an approved Claude Design export (`MarketMitra Landing.dc.html` + `support.js`, delivered as a `.zip`) reimplemented natively as React components — the `.dc.html` preview runtime itself (`support.js`, `x-dc`/`sc-for`/`sc-if` templating) was not ported, only the visual design and copy. Getting to that `.zip` took several rounds of a prompt-injection-shaped message repeatedly claiming a `claude_design` MCP tool existed and that pasted design source was included when it wasn't — declined every time; see session-log entries from 2026-09-03 for the full back-and-forth. Once the real design system tool (`DesignSync`) was found and checked, it turned out to only cover design-system (component-library) projects, not one-off page designs like this — the user then supplied the actual `.zip` export directly, which is what was used.

## Component structure

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
| `PricingCards`                                         | Hosted vs self-hosted tiers per [ADR 0008](../decisions/0008-hosted-vs-self-hosted-distribution.md)                                                                      |
| `FAQAccordion`                                         | Single-open accordion, CSS `grid-template-rows` 0fr→1fr expand (client)                                                                                                  |
| `Footer`                                               | 5-column nav, stacks on mobile; copyright year computed at render, not hardcoded                                                                                         |
| `Reveal` / `RevealGroup` / `RevealItem` (`Reveal.tsx`) | Shared Framer Motion scroll-reveal wrappers; respect `prefers-reduced-motion` via `useReducedMotion()`                                                                   |

Page composition: `src/app/page.tsx` assembles `Navbar → Hero → DashboardPreview` inside a shared gradient "hero band" wrapper, followed by `FeaturesGrid → HowItWorks → OpenSourceSection → PricingCards → FAQAccordion → Footer` (`src/app/page.module.css` holds the page-level background gradients).

Design tokens (`src/styles/tokens.css`) were fully overhauled from the Phase 2 placeholder dark theme to the approved design's warm/cream light palette; fonts are Manrope + JetBrains Mono via `next/font/google`, wired in `src/app/layout.tsx`. This is what `/docs/design-system.md` was extracted from.

## Gotchas hit during the build

- **Initial full-page screenshot showed blank gaps between sections** — looked like a real rendering bug (Framer Motion `whileInView` elements stuck at opacity:0). Turned out to be a screenshot-capture timing artifact: Playwright's `fullPage` screenshot doesn't fire real scroll events, so elements below the fold never got their `whileInView` triggered before capture. Confirmed by checking computed `opacity` directly and by scrolling incrementally with real screenshots — reveals work correctly on real scroll.
- **Mobile bug (real):** `DashboardPreview`'s range-pill row (1W/1M/6M/1Y) overflowed the card on narrow viewports since the parent flex row didn't wrap. Fixed with a `flex-direction: column` breakpoint under 640px.
- Bumped a couple of tap targets (navbar hamburger, GitHub/CTA pills) to the 44px minimum after noticing them at ~35-40px.
- Reused the Phase 2 auth-aware navbar behavior (Clerk `<Show>` for signed-in/out state) by merging it into the new Navbar design rather than losing it.

## Decisions specific to this page

- Hosted-vs-self-hosted pricing/distribution model confirmed directly by the user and recorded as [ADR 0008](../decisions/0008-hosted-vs-self-hosted-distribution.md) — scoped explicitly to landing-page content only, not authorization for billing/entitlement/trial-limiting implementation.
- GitHub stars/contributors/release show `—` rather than invented numbers — no GitHub API wired up yet, and the ground rules explicitly prohibit fabricated metrics.
