# 0008: Hosted vs. self-hosted distribution model

Date: 2026-09-03
Status: accepted

## Context

The landing page needs to present a concrete offer, not a generic "sign up" funnel — that requires a settled distribution/pricing model to write copy and CTAs against.

## Decision

Two distribution tracks:

- **Paid hosted:** MarketMitra-run infrastructure, 7-day free trial, limited number of AI-generated insights per day included in the paid tier after trial.
- **Free-forever self-hosted:** user runs their own deployment and brings their own API keys — for financial data sources, and for one LLM provider of their choice (Gemini, Anthropic, or OpenRouter) to power AI insights. No usage limits imposed by MarketMitra on this track.

## Consequences

- Landing page must present both tracks distinctly (e.g. two pricing cards / dual CTA), not a single funnel.
- This ADR governs landing-page content and positioning only. It is **not** authorization to implement billing, trial enforcement, usage metering, or auth entitlement logic — that is separate work, gated by an explicit greenlight per the Phase 4 feature process in `/CLAUDE.md`.
- The self-hosted BYOK path implies the app will eventually need pluggable credential handling for financial data APIs and for a choice of LLM provider — a concern for whichever future feature introduces AI insights, not addressed here.
