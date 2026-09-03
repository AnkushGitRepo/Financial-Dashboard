# 0009: MIT license for the self-hosted codebase

Date: 2026-09-04
Status: accepted

## Context

The landing page (built earlier, [ADR 0008](./0008-hosted-vs-self-hosted-distribution.md)) already publicly states "MIT licensed · no limits" on the self-hosted pricing tier and "MIT licensed" in the footer copyright line — but no `LICENSE` file existed in the repo, meaning a live, shipped claim wasn't actually backed by the repo's legal state. Writing the README's license section surfaced the gap.

## Decision

Add a standard MIT `LICENSE` file at the repo root, copyright held by "MarketMitra" (the project, not a named individual — no specific legal entity has been established for this project as of this decision). This makes the already-public landing-page claim accurate.

## Consequences

- The self-hosted codebase is genuinely open source under a permissive, widely-understood license, matching what the landing page already promises.
- The copyright holder name ("MarketMitra") is a placeholder for a project name, not a registered legal entity — if a company or specific legal owner is established later, the copyright line should be updated to match.
- Does not license the hosted service itself, only the source code — running the hosted MarketMitra product doesn't require MIT compliance from users, only redistributing/modifying the code does.
