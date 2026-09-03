# 0001: Teardown and rebuild as MarketMitra v2
Date: 2026-09-03
Status: accepted

## Context
v1 (Financial-Dashboard) was a React+Vite client, an Express server, a Django API, and a standalone Python scraper — four runtimes, no unified type system, no documented API surface, no auth provider, no deploy pipeline proven end-to-end. Extending it further would compound the split-stack complexity rather than resolve it.

## Decision
Tear down all v1 application code (keep `.git` history for reference) and rebuild from scratch as "MarketMitra v2": a single Next.js (App Router + TypeScript) app with MongoDB Atlas, Clerk auth, and Vercel deployment. This is a full rebuild, not a migration — no v1 code is ported forward as-is.

## Consequences
- Loses whatever was already working in v1 (IPO calendar, news sentiment, market indices) until reimplemented in v2 — nothing carries over automatically.
- Gains a single-language, single-runtime stack (TypeScript everywhere) instead of four.
- Old code remains reachable via `git log` / earlier commits if a v1 implementation detail needs to be referenced.
- Forces every feature to be rebuilt deliberately with a documented API surface from day one, rather than inheriting undocumented v1 endpoints.
