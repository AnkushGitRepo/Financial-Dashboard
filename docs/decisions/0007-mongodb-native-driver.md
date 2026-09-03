# 0007: Native MongoDB driver, not Mongoose

Date: 2026-09-03
Status: accepted

## Context

The app needs a MongoDB client usable from Next.js route handlers, which run as serverless functions on Vercel — connections must be cached across invocations, not reopened per request. Schema validation is already handled at API boundaries via Zod ([typescript coding-style rules](../../CLAUDE.md)).

## Decision

Use the official `mongodb` Node.js driver directly, with a single cached `MongoClient` connection helper (`src/lib/mongodb.ts`) reused across route handler invocations. No Mongoose or other ODM. Request/response shape validation happens via Zod schemas in each route handler, not via a schema/model layer.

## Consequences

- Avoids Mongoose's global model-registration pattern, which is awkward under serverless hot-reload/cold-start cycles.
- Collections are accessed directly (typed via TypeScript interfaces per collection) rather than through ODM models — slightly more boilerplate per query, but no hidden middleware/hooks magic.
- Validation logic (Zod) is decoupled from persistence (driver) — a schema change means updating a Zod schema and, separately, any typed collection interface, rather than one Mongoose model.
