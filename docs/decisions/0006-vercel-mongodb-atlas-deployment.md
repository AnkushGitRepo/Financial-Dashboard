# 0006: Vercel + MongoDB Atlas for deployment
Date: 2026-09-03
Status: accepted

## Context
v1 deployment was split across Render (server/api) and separately-configured client hosting, with a `render.yaml` and Docker config for the Django piece — multiple deploy targets to keep in sync. v2 consolidates to a single Next.js app (see [0002](./0002-nextjs-app-router.md), [0004](./0004-nextjs-api-routes-as-backend.md)).

## Decision
Deploy the Next.js app to Vercel and use MongoDB Atlas as the database. Deploy a blank shell early (Phase 2) to prove the pipeline before feature work accumulates, rather than validating deployment at the end.

## Consequences
- One deploy target, native Next.js support, no Docker/render.yaml to maintain.
- MongoDB connection string and Clerk keys are Vercel environment variables — never committed; `.env.local.example` documents required keys without values.
- Ties hosting to Vercel's platform constraints (function timeouts, etc.) — acceptable for this project's scope.
