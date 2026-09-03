# 0002: Next.js (App Router) + TypeScript as the application framework
Date: 2026-09-03
Status: accepted

## Context
v2 needs one framework that can serve a human dashboard UI and a documented, stable API surface for AI agent consumers, with a single deploy target and a single language across front and back end.

## Decision
Use Next.js with the App Router and TypeScript for the entire application — pages, layouts, and API route handlers (see [0004](./0004-nextjs-api-routes-as-backend.md) for the backend routing decision specifically).

## Consequences
- One codebase, one language (TypeScript), one Vercel deploy target for UI and API.
- App Router's route handlers (`app/api/**/route.ts`) double as the agent-consumable API surface documented in `/docs/api-surface.md`.
- Ties the project to Next.js conventions (server components, route groups, middleware) — acceptable since there's no cross-framework portability requirement.
