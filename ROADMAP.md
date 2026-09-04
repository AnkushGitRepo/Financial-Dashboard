# MarketMitra v2 — Master Build Roadmap

This is the entry-point document for building MarketMitra v2 across many sessions and many days. Read this first in any new chat, alongside `CLAUDE.md`. This document tracks *what phase we're in and what's left in it* — `CLAUDE.md` stays a short pointer, `/docs/architecture.md` describes the system as it stands, and this file is the actual working checklist.

## How to use this document

- Find the current phase (marked 🔄 below). Read its checklist. Work through unchecked items in order unless they're explicitly parallel.
- **After completing any single checklist item** — not just at the end of a phase — do all of the following before moving to the next item:
  1. Check the box in this file.
  2. If the item involved a real decision (a library choice, a schema choice, a structural change), add or update an ADR in `/docs/decisions/`.
  3. If the item changed the system's structure, update `/docs/architecture.md`.
  4. Append one line to `/docs/session-log.md`.
- This is more frequent than the archiving/pruning protocol from earlier — pruning old detail into `/docs/archive/` only happens when the user explicitly approves a phase as done. Checking boxes and logging happens continuously, every session, without waiting for approval.
- When a phase is fully checked off, stop and tell the user it's ready for review — don't self-approve and move to the next phase or run the pruning protocol without their explicit sign-off.
- Legend: ✅ Done · 🔄 In progress · ⬜ Todo · ⏸️ Deferred (no ETA) · ❓ Needs a dedicated discussion session before any build prompt is written — do not build from assumptions here.

---

## Phase 0 — Context Architecture ✅
`CLAUDE.md`, `/docs/decisions/`, `/docs/architecture.md`, `/docs/session-log.md`, `/docs/archive/` structure in place.

## Phase 1 — Teardown ✅
v1 code removed, history preserved, teardown committed as its own commit.

## Phase 2 — Scaffold + Deployment-Mode Gate ✅
- [x] Next.js (App Router, TypeScript) scaffold, ESLint/Prettier
- [x] Clerk deployed on the production (hosted) instance
- [x] Implement `NEXT_PUBLIC_DEPLOYMENT_MODE` (`hosted` | `selfhost`, defaults to `selfhost`) gate — see [ADR 0010](./docs/decisions/0010-deployment-mode-gate.md); implemented in `src/lib/deployment-mode.ts` + gated at every Clerk/billing mount point
- [x] Set `NEXT_PUBLIC_DEPLOYMENT_MODE=hosted` explicitly in the production Vercel environment — confirmed done by user 2026-09-04
- [x] Verify self-host mode skips Clerk and all billing UI entirely — confirmed 2026-09-04: `/dashboard` opens with 200 (no login), `/sign-in`+`/sign-up` 307-redirect to `/dashboard`, landing page has zero `pricing`/`#faq` references
- [x] Verify hosted mode is unchanged from current behavior once the flag is set — confirmed 2026-09-04: `/dashboard` redirects unauthenticated visitors through Clerk's handshake flow (matches prod), `/sign-in` renders the real widget, pricing section present; `npm run build` / `tsc --noEmit` / `eslint` all clean

## Phase 3 — Landing + Auth + Dashboard Shell ✅
- [x] Landing page design (hero, dashboard preview, features, pricing cards, FAQ, footer)
- [x] Sign-in / sign-up screens — on-brand split layout, border-clipping and composition bugs fixed
- [x] Final landing + auth designs implemented and approved
- [x] Implemented in Next.js + CSS Modules per `/docs/design-system.md`
- [x] Dashboard shell (empty-state layout only, no real feature data yet)
- [x] Responsive/mobile pass on all three surfaces — verified at 390px/820px/1440px+
- **Archiving protocol already run for this phase** — full build detail lives in [`/docs/archive/landing-page.md`](./docs/archive/landing-page.md), [`/docs/archive/dashboard-shell.md`](./docs/archive/dashboard-shell.md), [`/docs/archive/auth-pages.md`](./docs/archive/auth-pages.md); `/docs/architecture.md` holds the current summaries.

## Phase 4 — Fundamentals Data API (screener.in-equivalent) 🔄
Full spec already written — see `marketmitra-fundamentals-api-prompt.md`. Start this as its own multi-day sub-build once Phase 2–3 are approved. Checklist lives inside that document (storage decision → schema → Tier 1 ingestion → Tier 2 gap-fill → serving layer → docs); mirror its step completion back into this file as:
- [ ] Storage decision confirmed
- [ ] Schema defined
- [ ] Tier 1 (NSE/BSE) ingestion built
- [ ] Tier 2 (EODHD) gap-fill built
- [ ] Serving layer + endpoint docs

## Phase 5 — Alerts (stop loss, target, general price alerts) ❓
Needs a dedicated discussion: delivery channels beyond email, exact trigger logic, how alerts relate to the Phase 4 data API vs. live price feeds. Do not build from this one-line description.

## Phase 6 — News Feed (stock/company news) ❓
Needs a dedicated discussion: source(s) for news, how it's matched to specific companies/portfolio holdings, refresh cadence.

## Phase 7 — IPO Tracker + GMP Alerts (nodemailer) ❓
Needs a dedicated discussion: GMP data source (same tiered-sourcing principle as Phase 4 likely applies — check before assuming scraping), exact alert trigger logic (threshold AND/OR last-apply-date), reuse of Phase 5's alert delivery pipeline.

## Phase 8 — AI Insights (stock-level + portfolio-level) ❓
Needs a dedicated discussion: which LLM provider(s) for v1, insight scope/format, how trial-limit counting (from the hosted pricing model) actually gets enforced per insight generated.

## Phase 9 — API Surface Formalization + Agent-Context Docs ❓
Needs a dedicated discussion: documentation format (JSON/Markdown response modes as originally requested), testing playground scope, what "agent-context prompts" concretely means as a deliverable. Note: document endpoints incrementally as each phase ships them, not only in this dedicated pass.

## Phase 10 — AI Chat with RAG ❓
Needs a dedicated discussion: what's actually in the retrieval corpus (news? filings? portfolio data? all three?), which vector store, how it's scoped per-user vs. general market knowledge.

## Phase 11 — Advanced Analytical Agents (TradingAgents-pattern, built in-house) ❓
Needs a dedicated discussion once Phase 8–10 exist to build on. Reminder: this means building our own multi-agent analysis pattern inspired by TauricResearch's architecture — not importing their repo as a dependency.

## Phase 12 — Mobile App (Expo/React Native, hosted-only) ⬜
Full spec already written — see `marketmitra-mobile-app-prompt.md`. Deprioritized relative to the web feature phases above; pick up when there's bandwidth for a parallel track. In-app purchase handling remains an explicit open decision inside that document — resolve before App Store submission, not before starting the build.

---

## Deferred / Held Separately

- **Company legal issues / litigation tracking** — deferred, no data source decided, no ETA. Revisit only when explicitly raised again.
- **NautilusTrader** — not scheduled in any phase above. Requires its own dedicated conversation on scope (backtesting/research-only vs. live trade execution) before any code is written, given the regulatory/liability weight of the live-execution option. Do not fold this into any other phase's work without that conversation happening first.

---

## Standing rules that apply across every phase

- Stack: Next.js + TypeScript, CSS Modules only (no Tailwind/Bootstrap), MongoDB (unless Phase 4's storage discussion changes this for that service specifically), monorepo (`apps/web`, `apps/mobile`, `packages/shared`, and — pending Phase 4 — likely a `services/` directory for backend services like the fundamentals API).
- `DEPLOYMENT_MODE` gate governs all auth/billing code paths — self-host must remain free, full-featured, and BYOK for every phase, not just the ones built so far.
- Scraping (Scrapling/Screener.in or similar) never enters production code, in any phase — dev/test-only, if used at all.
- Any real architectural or product decision made while working a phase gets an ADR — don't let a decision live only in chat history.
