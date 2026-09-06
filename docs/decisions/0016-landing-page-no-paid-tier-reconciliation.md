# 0016: Reconcile the landing page with "no paid tier" (ADR 0011 vs ADR 0008)

Date: 2026-09-06
Status: accepted

## Context

[ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md) established, as
a product-wide decision, that **MarketMitra has no paid tier, no billing,
and no trial limits — free and open source, full stop** — and marked
[ADR 0008](./0008-hosted-vs-self-hosted-distribution.md) (the paid-hosted
/ 7-day-trial / free-self-hosted model) superseded in its entirety.

The landing page was built from ADR 0008 and never reconciled. It still
shipped, in hosted mode:

- A **Pricing** section (`PricingCards.tsx`) with a "Hosted" card showing
  `$[price]/mo`, a "7-day free trial" badge, a "Trial limit — [N] AI
  insights/day during trial" box, and "Start free trial" / "No card
  needed" CTAs.
- An **FAQ** (`FAQAccordion.tsx`) whose first two questions were "What
  happens after my 7-day trial ends?" and a trial-vs-hosted-keys answer.
- Footer links labelled "Pricing".

[ADR 0010](./0010-deployment-mode-gate.md)'s `isHosted()` gate renders
those two sections only in hosted mode. That gate's **auth** purpose
(Clerk on/off) is unaffected and stays; only its use as a de-facto
"billing UI" switch is what this ADR addresses.

## Decision

Reconcile the copy to the ADR 0011 reality. No new mechanism; content and
labels only. Answers below are the user's from the scoping questions.

### 1. "Pricing" → "Two ways to run it", both free

`PricingCards.tsx` keeps its two-card layout (the hosted-vs-self-host
explanation is genuinely useful) but drops every billing artefact:

- Remove the `$[price]/mo` price row, the "7-day free trial" badge, the
  "Trial limit / [N] AI insights/day during trial" box, and the "No card
  needed" note from the Hosted card.
- Hosted card reads as **free, hosted by the maintainer**. CTA stays
  "Sign up" → `/sign-up` (hosted still has accounts — that's an auth
  choice, ADR 0010, not billing).
- Section eyebrow changes from "Pricing" to "Hosted or self-hosted"; the
  `<h2>` is already "Two ways to run it". The section keeps `id="pricing"`
  (anchor churn isn't worth it); Footer's "Pricing" link is relabelled
  "Hosted or self-host" (same `#pricing` href).

### 2. AI insights need the user's own key — hosted and self-hosted

Per the user: **AI insights (Phase 8) require the user's own AI provider
key in both hosted and self-hosted deployments.** The maintainer does not
put a shared AI key on the hosted instance. The hosted card's "AI insights
running on our API keys" line is replaced with "Bring your own AI provider
key for insights (Gemini / Anthropic / OpenRouter)".

Also per the user: **the hosted (shared) instance carries fair-use rate
limits** on general access, so one user can't exhaust it for everyone;
self-hosting has no such limits. This is fair-use protection of a free
shared service, not a paywall — the cards say so plainly, and it's the
one real functional difference between the two ways to run it besides
"who holds the keys".

### 3. FAQ — rewrite the stale entries, keep the section

`FAQAccordion.tsx` stays a section. The trial/billing questions are
replaced with accurate ones: is there a paid version (no), hosted vs
self-host, BYO keys (AI key needed either way; hosted supplies market
data), the hosted rate limits, where data lives, the open API. No
`7-day trial` language anywhere.

### 4. `isHosted()` gate unchanged

`page.tsx` still renders `PricingCards` + `FAQAccordion` only in hosted
mode, and Navbar/Footer still drop `#pricing` / `#faq` links in self-host
mode. That's now purely "the self-hosted landing page is leaner" (a
self-hoster already made their choice), not billing — ADR 0010's original
rationale still holds. No code change to the gate itself.

## Consequences

- ADR 0008 stays `superseded` (already marked so by ADR 0011); this ADR is
  the concrete cleanup ADR 0011 called for.
- The landing page no longer implies a cost, a trial, or a per-day AI cap
  anywhere. Nothing in the product ever charged — this only removes copy
  that said otherwise.
- **Phase 8 (AI Insights)** inherits a settled constraint: BYO AI key in
  every deployment mode; no shared-key path to build or meter.
- A hosted-instance rate-limiting mechanism is now a stated product
  expectation but is **not built** — it's a Phase 9 (API surface) /
  infrastructure concern, tracked in `ROADMAP.md`, not part of this
  copy-only change.
- `CLAUDE.md`'s "Active focus" note about this reconciliation being
  outstanding can be cleared once this ships.
