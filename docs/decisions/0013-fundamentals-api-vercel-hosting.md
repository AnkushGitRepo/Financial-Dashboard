# 0013: Host fundamentals-api on Vercel (Python functions) + Neon Postgres, both within the existing Vercel account

Date: 2026-09-05
Status: accepted

## Context

`services/fundamentals-api` (see [ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md))
only ran on a developer's machine. The dashboard UI built on top of it
(see [ADR 0012](./0012-portfolio-holdings-and-real-data-wiring.md)) needs a
real, publicly reachable instance in production, plus a production
Postgres database, before deploying the Next.js app would show anything
but degraded "unavailable" states.

The assistant operating this project has a hard constraint: it may not
create new accounts on third-party services (Railway, Render, Fly.io,
Supabase, standalone Neon, etc.) even with explicit user authorization.
Provisioning a new *resource* inside an account the user already owns and
is authenticated to is not the same thing and is permitted.

## Decision

Host `fundamentals-api` as a Vercel Python serverless function (natively
supported — a FastAPI `app` instance is a first-class Vercel entrypoint)
in the same Vercel team already used for the Next.js app, and use Vercel's
Neon-backed Postgres marketplace integration (free tier) for its database.
No new third-party account is created; both are resources inside the
existing `ankushgupta` Vercel team.

### Trimmed production dependency set

The service's full `pyproject.toml` dependency list (used for local dev
and tests) is far too heavy for a serverless function: `scrapling[fetchers]`
pulls in Playwright + Patchright (~270MB), and `camelot-py`/
`opencv-python-headless`/`pdfplumber` support `app/ingestion/pdf_financials.py`,
which nothing on the live request path imports (the Tier 1 filing-URL
discovery step that would wire it in hasn't been built — see ROADMAP.md's
Phase 4 checklist). `polars` is declared but never actually imported
anywhere.

Getting Tier 3 deployable took a second pass: the first attempt kept
`scrapling.fetchers.Fetcher` (the plain curl_cffi-based static fetcher, not
a browser one) and just pinned `curl_cffi` directly instead of the
`[fetchers]` extra. That still crashed at import time in production —
`scrapling.engines.toolbelt.convertor` (imported by `Fetcher`'s own module
chain) does a hard top-level `from playwright._impl._errors import Error`,
so importing `Fetcher` at all drags in Playwright's ~130MB bundled Node
driver regardless of which fetcher class is actually used. The fix:
`app/ingestion/tier3_screener_scrapling/scraper.py` now fetches pages with
`httpx` directly and parses them with `scrapling.parser.Selector` — the
same CSS/text parsing engine `Fetcher`'s responses use internally, but a
fully separate module with no fetchers/Playwright import chain. Tests
already built their fixture pages via `Selector` (see
`tests/test_tier3_scraper.py`), so this made the fetch path and test path
consistent rather than introducing a divergence.

A separate `services/fundamentals-api/requirements.txt` (Vercel-detected,
takes precedence for the deployed function) lists only what the live app
actually imports: fastapi, uvicorn, pydantic(-settings), httpx, orjson,
sqlalchemy[asyncio]+asyncpg, nsepython, bsedata, yfinance, `scrapling` base
(no extras — `Selector` needs none of them), lxml. `pyproject.toml` is
untouched — local dev and the test suite still install everything,
including the PDF/XBRL modules the tests exercise directly.

### Serverless-safe database engine

`app/db/session.py`'s async engine now uses `NullPool` and
`connect_args={"statement_cache_size": 0}`. Neon's pooled connection
string is PgBouncer in transaction-pooling mode, which doesn't support
session-level prepared statements — asyncpg's statement cache has to be
disabled against it, and each serverless invocation should take its own
short-lived connection rather than holding a local pool open. This is a
no-op change in behavior against a plain local Postgres, so local dev is
unaffected.

### Migrations stay out-of-band

Alembic is excluded from `requirements.txt` (the deployed function never
runs migrations itself) and is instead run manually from a developer
machine, pointed at the production `DATABASE_URL`, whenever the schema
changes.

## Consequences

- If the trimmed dependency set turns out to still exceed Vercel's function
  size limit in practice, the next thing to cut is `yfinance` (pulls
  pandas/numpy) or `nsepython` — not yet needed as of this writing.
- Wiring the Tier 1 filing-discovery step later will need to either extend
  `requirements.txt` with `pdfplumber`/`camelot-py`/`opencv-python-headless`
  (re-inflating the function) or move PDF/XBRL processing to a separate,
  differently-hosted job — a decision for whenever that work actually
  starts, not now.
- Vercel Python functions have a cold-start cost; acceptable for this
  service's request volume today.

## Amendment (2026-09-06): pdfplumber added to the prod set for pdf_text.py

Phase 10a (ADR 0020) needs plain-text extraction from annual-report / DRHP
PDFs, served to the main app's corpus indexer at `POST /documents/extract-text`.
That route is on the live request path, so `pdfplumber>=0.11` is now in
`requirements.txt`. It is pure Python (`pdfminer.six` + `Pillow`), no system
dependency — unlike `camelot-py` / `opencv-python-headless`, which stay
**out** (Ghostscript, large wheels; only `pdf_financials.py`'s table
extraction uses them and `main.py` still never imports that module).

`app/ingestion/pdf_text.py` still imports `pdfplumber` lazily inside the
extract function, so a self-host that trims it degrades to a 422, not an
app-startup crash. Side effect: `filing_discovery.py`'s lazy
`pdf_financials` import (the Tier 1 PDF branch, previously inert in prod
per the 2026-09-06 regression fix) now resolves in prod too — a latent
capability unlock, still graceful on failure, no regression.
