# 0004: Next.js API routes as the backend (no separate Express server)

Date: 2026-09-03
Status: accepted

## Context

Ground rules call for a "MERN-adjacent" backend and require explicitly deciding between Next.js API routes and a standalone Node/Express server rather than mixing both silently. v1 ran a separate Express server (`/server`) plus a Django API (`/api`) alongside the client — three deploy targets for one product. User was asked directly and chose to consolidate.

## Decision

All backend logic lives in Next.js App Router route handlers under `app/api/**/route.ts`. There is no separate Express (or other) server process. MongoDB (Atlas) is accessed directly from route handlers via a shared connection helper.

## Consequences

- Single Vercel deploy target for UI and API — no CORS configuration, no duplicated env/auth wiring between two servers.
- Route handlers are the same artifact documented in `/docs/api-surface.md` for agent consumers — no translation layer between "internal" and "external" API.
- If a future need arises for long-running jobs or workers outside the request/response cycle (e.g. scheduled scraping), that will require a separate decision (e.g. Vercel Cron, a queue, or a small worker service) — this ADR does not cover background job infrastructure.
