# 0005: Clerk for authentication
Date: 2026-09-03
Status: accepted

## Context
v1 had a hand-rolled registration/OTP/login flow (see v1 commit history, e.g. "Improve registration flow, OTP verification"). Hand-rolled auth is a recurring source of bugs and security risk, and isn't a differentiator for this product.

## Decision
Use Clerk for all authentication (sign-up, sign-in, session management). Next.js middleware protects `/dashboard` and other authenticated routes; the landing route stays public.

## Consequences
- Removes the need to build/maintain password hashing, OTP delivery, session tokens, and password-reset flows.
- Adds a third-party auth dependency and its cost/rate-limit profile — track any relevant limits in `/docs/data-sources.md` if Clerk API usage becomes a constraint.
- API route handlers that need to identify the caller (for both UI and agent consumers) use Clerk's server-side session/auth helpers rather than custom JWT logic.
