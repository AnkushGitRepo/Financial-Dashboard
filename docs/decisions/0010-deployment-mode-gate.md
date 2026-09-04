# 0010: Deployment mode gate (`DEPLOYMENT_MODE`)

Date: 2026-09-04
Status: accepted

## Context

[ADR 0008](./0008-hosted-vs-self-hosted-distribution.md) committed to two distribution tracks — a paid hosted deployment and a free self-hosted one — but scoped that decision to landing-page content and positioning only, explicitly deferring the actual auth/billing implementation. That implementation now needs a design: one codebase has to serve both a paid hosted product (this project's own Vercel deployment, Clerk auth, a trial/billing model) and a free self-hosted product (anyone's own clone, their own keys, no billing), without maintaining two forks or two codebases.

## Decision

A single `NEXT_PUBLIC_DEPLOYMENT_MODE` environment variable, with two valid values:

- `hosted` — Clerk auth is active: `ClerkProvider` is mounted, middleware protects `/dashboard`, `/sign-in` and `/sign-up` render the real Clerk widgets, and pricing/billing UI renders on the landing page.
- `selfhost` — the default whenever the variable is unset. Auth is skipped entirely: no `ClerkProvider`, `/dashboard` is open with no login, `/sign-in` and `/sign-up` redirect straight to `/dashboard` instead of rendering, and all pricing/upgrade/billing UI is not rendered at all (not hidden with CSS — not in the response).

A single helper, `isHosted()` in `src/lib/deployment-mode.ts`, is the one source of truth for this check (`process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'hosted'`). It's a `NEXT_PUBLIC_` var specifically so the same helper works unmodified in server code and client components, with no prop-drilling or duplicated env logic.

The gate is centralized where auth actually gets decided:

- `src/proxy.ts` (middleware) — the one place that decides whether `clerkMiddleware`'s route protection runs at all, or every request passes through untouched.
- `src/app/layout.tsx` — the one place that decides whether `<ClerkProvider>` is mounted.
- `src/app/sign-in/[[...sign-in]]/page.tsx` and `src/app/sign-up/[[...sign-up]]/page.tsx` — redirect to `/dashboard` instead of rendering Clerk's `<SignIn>`/`<SignUp>` when not hosted (required: rendering those with no `ClerkProvider` in the tree throws).

UI components that render Clerk hooks/components or billing content each gate their own piece behind the same `isHosted()` check, since neither can be centralized further without breaking React's rules of hooks or leaving dead UI in the tree:

- `Navbar` — Clerk's `<Show>`-based CTA only renders in hosted mode; selfhost mode gets a plain `/dashboard` link. Its `#faq` nav link is dropped in selfhost mode since that section doesn't render.
- `Sidebar` — its Clerk-dependent bottom section (`useUser()`, `<UserButton>`) is split into a separate `HostedUserFooter` component so the hook is only ever mounted in hosted mode; selfhost mode shows a static "Local user" label instead.
- `page.tsx` — `PricingCards` and `FAQAccordion` (both entirely billing/trial content) don't render at all in selfhost mode.
- `Footer` — drops its `#pricing` and `#faq` links in selfhost mode rather than leaving dead anchors to sections that no longer exist on the page.

The existing production deployment (`marketmitra-v2.vercel.app`) must have `NEXT_PUBLIC_DEPLOYMENT_MODE=hosted` set explicitly in its Vercel project environment variables going forward. Without it, the next deploy defaults that instance to self-host behavior and silently turns off its own auth — this is a required manual follow-up action, not something this change can do on its own.

Self-host auth behavior — "no login, single shared local user" — is deliberately left open here, not decided permanently. It's a placeholder chosen so a fresh clone works with zero configuration. Adding a real self-host login option later should only require changing what happens inside the already-established `!isHosted()` branches, not restructuring how the gate itself works.

## Consequences

- One repository, one deploy pipeline, for both products — no fork to keep in sync.
- Billing and Clerk auth code stays in the public repo, readable by anyone self-hosting, but is inert without `DEPLOYMENT_MODE=hosted` and real Clerk/billing keys configured.
- Self-hosted users configure zero auth or billing keys — reflected in `.env.local.example` and the README's setup section.
- A missing `NEXT_PUBLIC_DEPLOYMENT_MODE=hosted` env var on the production Vercel project is now a real deployment footgun: must be set once as a follow-up to this change, and verified after the next hosted deploy.
- Self-host auth (single shared local user, no login) is explicitly not a final decision — revisit when self-host multi-user or local login is actually requested.
