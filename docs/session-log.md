# Session Log

Rolling log of work sessions, most recent first is NOT required — append chronologically (oldest first, newest at bottom), read the **last 3 entries** to catch up. When this file grows past ~15-20 entries, the oldest get rolled up into `/docs/archive/session-log-archive.md` (see the context maintenance protocol in `/CLAUDE.md`). Never rewrite history — only append or, at pruning time, move old entries out wholesale.

> **The Phase 0–9 build history is in [`/docs/archive/session-log-archive.md`](./archive/session-log-archive.md)** (Rollup 1 = Phases 0–7, Rollup 2 = Phases 8–9), rolled up as each was signed off. Per-feature build detail: [`/docs/archive/`](./archive/).

## 2026-09-06 — Rate limiting activated in prod (Upstash provisioned)

- User created the Upstash store via the Vercel dashboard: **`marketmitra-ratelimit`** ("Upstash for Redis", Free, 500k commands/mo), **primary region `iad1`** (co-located with the functions, as advised), connected to **both** Vercel projects (Production + Preview).
- The Vercel Upstash integration injects **`KV_REST_API_URL` / `KV_REST_API_TOKEN`** (+ `KV_URL` / `REDIS_URL` / read-only token) — *not* the `UPSTASH_REDIS_REST_*` names the code originally expected. Fixed in `17c4fac`: `src/lib/rateLimit.ts` reads `KV_REST_API_* || UPSTASH_REDIS_REST_*`; `services/fundamentals-api/app/config.py` uses `AliasChoices(...)` + `populate_by_name` (keeps the by-name test construction working). `.env.example` (both), README (both), ADR 0019 updated.
- Redeployed both: `marketmitra-v2` (`chsaxkpoc`), `marketmitra-fundamentals-api` (`eo8vuc9qe`).
- **Verified live:**
  - `marketmitra-v2` `/api/search?q=…` — single request returns `RateLimit-Limit: 30 / Remaining: 29 / Reset: 51`; 40 rapid anon requests → first 29× `200`, then `429` (default anon tier = 30/min, sliding window).
  - `marketmitra-fundamentals-api` `/health` → **no** `RateLimit-*` headers (exempt); `/indices` → `RateLimit-Limit: 120`, `Remaining` decrements 119→115 across 5 requests (fixed-window, `RATE_LIMIT_PER_MINUTE` default).
- ADR 0016's landing-page "the hosted shared instance has fair-use rate limits" line is now true.
- **Phase 9 is functionally complete** — MCP server, rate limiting (both services), and the API explorer are all built, deployed, and verified. Awaiting the user's explicit sign-off before the archiving protocol.
- Minor: the Upstash REST tokens were pasted into chat during setup. They're scoped to this rate-limit KV store (no user data) and freshly created; rotate via the store's Settings → "Rotate Secrets" if desired.
- Next: Phase 9 sign-off. Still open: the two GitHub Actions scheduler secrets; one real alert fire + one real IPO-alert fire in market hours; Resend email; Phase 4 Tier 1 filing-URL discovery.

## 2026-09-06 — Phase 4 Tier 1 filing-URL discovery built (post-sign-off follow-up)

- User picked this off the follow-up list. It's the step that finds a company's latest financial-results filing so statements aren't a Screener scrape.
- **`app/ingestion/filing_discovery.py`** (new): `discover_latest_financial_filing(nse_symbol, bse_code)` → `FilingRef` (exchange / period_end / period_type / consolidated / xbrl_url / pdf_url / filed_at) or `None`.
  - NSE `/api/corporates-financial-results` (primary, same cookie handshake as the shareholding call), BSE `api.bseindia.com/.../AnnGetData/w` (fallback, PDF-only, results-category + a period date parseable from the announcement subject).
  - Pure parsers `parse_nse_financial_results` / `parse_bse_annget_data` / `pick_latest` (newest period → consolidated → has-XBRL tiebreak) + `_period_end_from_text` (handles "quarter ended June 30, 2026" and "31st March, 2026").
  - `extract_tier1_line_items(filing, statement_type)` downloads the XBRL (→ `xbrl_parser`) or PDF (→ `pdf_financials`) and attaches the discovered `period_end` / `period_type` to each `{label, value}`.
- **Wired into `fundamentals_service.get_financial_statement`**: try Tier 1 first; if it yields items, upsert them as `tier1_nse_bse` and skip the Screener scrape for that call (history still comes from Tier 3 on later refreshes); otherwise Tier 3 as before. New `_upsert_financial_items` helper (used for both tiers). `financials_tier1_enabled` config flag (default true).
- **Honest limitation** (same as the rest of Tier 1): NSE is Akamai-blocked from this env and likely from Vercel too, so the *network* path is unverified live. Parsers are fixture-tested (`tests/test_filing_discovery.py`, 13 cases + 2 new JSON fixtures); every failure — blocked, timeout, unrecognized shape, nothing to report — collapses to "Tier 1 had nothing" and Tier 3 serves. **No regression** to the financials endpoint.
- fundamentals-api suite **86 passed** (was 73), ruff clean on the new/changed files (4 pre-existing errors in `test_tier3_scraper.py` import order, untouched). architecture.md / archive/fundamentals-data-service.md / ROADMAP / service README / `.env.example` updated.
- Next: deploy fundamentals-api; smoke-check the financials endpoint still serves (expected: degrades to Tier 3 in prod if NSE stays blocked). Follow-up: verify the NSE/BSE parsers against real live responses + correct the field maps; multi-period XBRL context extraction.

## 2026-09-06 — Tier 1 discovery: prod-startup regression caught + fixed

- The first deploy of the Tier 1 filing-discovery work **took the fundamentals-api down** — `/health` → 500 `FUNCTION_INVOCATION_FAILED`. Root cause: `filing_discovery.py` did `from app.ingestion import pdf_financials` at module load, and `filing_discovery` is now on the live request path (`fundamentals_service` → routes → `main`). `pdf_financials` does `import pdfplumber`, which the **trimmed production `requirements.txt` deliberately omits** (ADR 0013 — its comment literally says "only `pdf_financials.py` imports them, which `main.py` never imports"). → `ModuleNotFoundError` at import → whole app fails to start.
- **Fix (`d2924c1`):** `pdf_financials` is now imported lazily inside the PDF branch of `extract_tier1_line_items`; absent `pdfplumber` that branch just logs + returns no items and Tier 3 serves. `xbrl_parser` (→ `lxml`, which *is* in requirements) stays a normal import, so the XBRL path is unaffected. Verified locally by blocking `pdfplumber` in `sys.modules` and re-importing the app.
- Redeployed (`lupeu7saw`). Prod restored: `/health` 200, `/indices` 200, `/ratios` 200; `/companies/RELIANCE/financials/profit_and_loss` → 200, 144 rows, **all `tier3_screener`** — Tier 1 discovery ran, NSE was unreachable from Vercel (as expected), and it degraded cleanly to Tier 3. **No visible change to the data in prod today** — the Tier 1 machinery is in place and will produce data only from an environment where NSE/BSE respond (a self-hoster in India, etc.).
- Lesson for next time: anything added to `fundamentals_service`'s import chain must only pull from the trimmed `requirements.txt`. `pdfplumber` / `camelot` / `opencv` are dev/test-only there.

## 2026-09-06 — Phase 9 signed off; archiving/pruning protocol run

- User approved Phase 9 ("approved"). Context maintenance protocol:
  - **New archive file** `/docs/archive/api-surface.md` — full Phase 9 build detail (MCP server placement decision + tools + tests; rate limiting both services incl. the `KV_REST_API_*` env-name gotcha and the Upstash provisioning; API explorer + the 3 bugs found in prod verification) plus the Tier 1 filing-discovery follow-up and its prod-startup regression.
  - **`/docs/architecture.md`** — status header → "Phases 0–9 signed off and in production"; the "MCP server (Phase 9 — in progress)" section collapsed to a done "API surface" summary + archive link; Phase 9 added to the phase list + shipped-features list; the open-follow-ups paragraph trimmed to just the user-action items.
  - **`/docs/session-log.md`** — Phase 8 arc + Phase 9 build entries (~14) rolled into `session-log-archive.md` as "Rollup 2" (one line each). Live log keeps the last 3 + this entry.
  - **`ROADMAP.md`** — Phase 9 → ✅ signed off + archived.
  - **`CLAUDE.md`** — Current phase / Active focus already refreshed (`54ebd45`); tightened for post-sign-off.
- Not pruned (living reference): `/docs/decisions/`, `/docs/data-sources.md`, `/docs/api-surface.md`.
- Next: no build in flight. Open (all user actions): activate the two GitHub Actions schedulers; Resend email; one real alert fire + one real IPO-alert fire in market hours; DRHP grounding. Phases 10 (RAG) / 11 (multi-agent) need a scoping session.

## 2026-09-06 — Both GitHub Actions schedulers activated + validated

- User ran `gh auth login`; I did the rest.
- **Tokens rotated** (the originals were `Secret`-type on Vercel and unrecoverable): fresh `CRON_SECRET` and `IPO_INGEST_TOKEN` generated, set as GitHub repo secrets (`gh secret set`) **and** on the Vercel projects via `vercel env update` (`CRON_SECRET` → `marketmitra-v2`; `IPO_INGEST_TOKEN` → `marketmitra-fundamentals-api`, plus the vestigial copy on `marketmitra-v2` for consistency). Both projects redeployed (`jlkj9a5p0` / `6j7dxlcin`).
- **Verified live:**
  - `POST /api/cron/evaluate-alerts?force=1` — new token → `200 {ran:true, activeAlerts:1, ...}`; wrong token → `401`.
  - `POST /ipos/ingest {"rows":[]}` — no token / wrong token → `401`; new token → `200`.
  - `gh workflow run evaluate-alerts.yml` → **success** (11s).
  - `gh workflow run refresh-ipos.yml` → **success** (37s): Playwright rendered the InvestorGain SPA, **parsed 40 IPO rows, ingested 40** (`ingest ok: {'ingested': 40, 'total': 39}`) — this is the first time that render step has run in CI, and it worked.
- Both `schedule:` triggers now fire from `main` (the default branch): `evaluate-alerts` every 10 min during ~market hours, `refresh-ipos` every ~2 h.
- **Still open:** Phase 5 email (Resend — needs a from-domain decision); one real alert fire + one real IPO-alert fire on an actual trigger during market hours (the plumbing is proven; just needs a live trigger to watch a notification land); DRHP grounding. Phases 10/11 need a scoping session.

## 2026-09-06 — Alert email seam wired against Resend (ships inert)

- `npm install resend`. `sendEmail()` in `src/lib/notifications/channels.ts` now builds a plain transactional email via new `renderEmail()` (subject `[MarketMitra] <title>`, HTML-escaped body + text alt, deep link to `NEXT_PUBLIC_APP_URL + payload.href`, "not investment advice" footer) and calls `resend.emails.send(...)`.
- **Still config-gated and non-throwing** — no behaviour change without a key: no `RESEND_API_KEY` → `{status:'skipped'}` (in-app + webhook only, unchanged); provider error → `{status:'error', detail}`; success → `{status:'sent'}`. `ALERT_EMAIL_FROM` overrides the sender (default `onboarding@resend.dev`, which only reaches the Resend account owner — hosted multi-recipient sending needs a Resend-verified domain).
- 6 new tests (`channels.test.ts`, `vi.mock('resend')`): skipped w/o key, sent, honours `ALERT_EMAIL_FROM`, maps provider error, catches SDK throw, escapes HTML. Full suite **164 passed**; tsc / lint / `next build` clean.
- `.env.local.example` + README alerts-cron paragraph updated; ADR 0014 amendment appended; ROADMAP Phase-5 follow-up → `[~]` (code done, needs a Resend account).
- Committed `52cbea1`, pushed `v2` + `main`, deployed `marketmitra-v2` to prod (`marketmitra-v2-ffk1v3edn`, READY). Smoke: `/` 200, `/api/mcp` `tools/list` returns the 7 tools. Ships **inert** — no `RESEND_API_KEY` in prod yet.
- **To activate:** user creates a Resend account, sets `RESEND_API_KEY` (+ `ALERT_EMAIL_FROM` with a verified domain for hosted), redeploys; then watch one real send.

## 2026-09-06 — Resend key set in prod; email delivery live

- User created a Resend account and set `RESEND_API_KEY` (Secret type) on `marketmitra-v2` **production**. Redeployed (`marketmitra-v2-crq84tpa3`, Ready). `/` 200.
- Email delivery is now **active** in prod: a triggered alert/IPO notification will fan out to email (hosted mode → the Clerk user's primary address) in addition to in-app + webhook.
- **Caveat still standing:** `ALERT_EMAIL_FROM` is unset, so the sender is Resend's shared `onboarding@resend.dev`, which **only delivers to the Resend account owner's own email**. For the first live test to actually land, the alert-owner's Clerk primary email must be that same address. Arbitrary-recipient sending needs a Resend-verified domain in `ALERT_EMAIL_FROM`.
- ROADMAP Phase-5 email line → `[x]` (with the sender caveat noted).
- Next: watch one real alert fire + one real IPO-alert fire during NSE market hours (Sat/Sun now — markets closed; the 10-min `evaluate-alerts` scheduler no-ops outside hours unless `?force=1`).

## 2026-09-06 — Phase 10 (RAG) scoping session → ADR 0020

- User chose to scope Phase 10 next. Ran a 4-question scoping questionnaire (corpus / vector store / scoping / surfaces).
- **Answers:** corpus = news + filings/fundamentals + per-user portfolio & notes + structured data; store = Atlas Vector Search + **local** embeddings (transformers.js, no key); scoping = per-user; surfaces = chat + insights + a new research surface.
- **[ADR 0020](./decisions/0020-phase-10-rag-chat.md)** written (status: *proposed*). Key resolutions: one `chunks` collection + Atlas Vector Search (free-tier OK); local embeddings keep BYO-key limited to generation and self-host zero-config; indexing runs as a token-guarded cron (same pattern as `evaluate-alerts`/`refresh-ipos`); PDF→text stays on the fundamentals-api Python side; structured market data is *tool-called via the MCP layer*, not embedded → chat becomes agentic; graceful fallback to today's prompt-stuffing when no vector index (non-Atlas self-host). DRHP grounding folds into Phase 10a.
- **Two open questions flagged for the user before the build checklist is final:** (A) full per-user duplication vs. a shared-public-corpus + per-user-private reconciliation (the ADR argues per-user copies of public news/PDFs blow the Atlas M0 512 MB free tier); (B) 10a/10b surface phasing vs. all three surfaces at once.
- ROADMAP Phase 10 section rewritten (🔄 scoped) with the decisions + the two open questions. Not yet a build.

## 2026-09-06 — Phase 10 open questions resolved; 10a build checklist written

- User resolved both ADR 0020 open questions with the recommended options: **A** → shared public corpus (`userId: null`, indexed once) + strictly-filtered per-user private layer (not full per-user duplication); **B** → split into **Phase 10a** (plumbing + agentic chat + retrieval-grounded insights, DRHP grounding included) and **Phase 10b** (dedicated `/dashboard/research` surface, follow-on).
- ADR 0020 status → *accepted*; "Open questions" section → "Resolved".
- **ROADMAP Phase 10a build checklist** written (13 items, all ⬜): embed lib (`@xenova/transformers`), `chunks` collection + Atlas Vector Search index, chunker, fundamentals-api PDF→text endpoint, `POST /api/cron/index-corpus` + GitHub Actions schedule, per-user corpus sync, `userNotes` + `chatMessages` collections, `src/lib/rag/retrieve.ts`, agentic chat rework (`streamText` + MCP tools + `search_context`), grounded insights, deployment-mode fallback, cross-cutting (tests/docs/deploy). Phase 10b left as a one-liner to scope later.
- Still **not a build** — checklist is the spec; no Phase 10 code written. Next session can start at the top of the 10a list.

## 2026-09-06 — Phase 10a signed off, merged, deployed — but retrieval is inert on hosted

- User signed off Phase 10a. `phase-10-rag` (11 feat commits) fast-forwarded into `main` + `v2`; both Vercel projects deployed (`marketmitra-v2` `jqcq5wnm8`, `marketmitra-fundamentals-api` `666bnvlsb`).
- **Two bugs caught + fixed during the merge/deploy:**
  - `903b3e0` — 2 embedded NUL bytes in `chunkHash`'s template literal (`${source}\0${chunkIndex}\0${text}`) made git treat `chunks.ts` as binary. Replaced with spaces; all 247 tests still green (they only assert hash determinism/length).
  - `4fa2664` — `@huggingface/transformers` was a static top-level import in `embed.ts`, so **every route that transitively imports it 500'd at cold start** on Vercel: `libonnxruntime.so.1: cannot open shared object file`. Made it a lazy `await import()` inside `getPipeline()` (type-only import kept). Now the native-lib failure throws at embed time → `retrieve()`/indexer catch it → graceful fallback.
- **`8829541` → `e5529cb` (reverted):** tried `outputFileTracingIncludes` to bundle `libonnxruntime.so.1` into the embed routes. Deploy failed — **"No more than 12 Serverless Functions on the Hobby plan"** (per-route tracing keys de-grouped the API functions). Reverted to the safe lazy-import state.
- **Net state:** prod is healthy, no regressions (`/` 200; `/api/cron/index-corpus`, `/api/notes` → 401 not 500; fundamentals `/health` + `/indices` + `/documents/extract-text` OK). **But on the hosted deployment `retrieve()` always returns `null`** — onnxruntime-node won't load — so chat/insights/notes/holdings behave exactly as pre-Phase-10. Self-host on a normal Node host gets full RAG. The Atlas Vector Search index was NOT created (pointless until embeddings run).
- **Open decision (ROADMAP "BLOCKER"):** make embeddings work on Vercel — (a) `onnxruntime-web` WASM backend, (b) a separate embedding service, or (c) Vercel Pro. Then create the vector index + first indexer run.

## 2026-09-07 — onnxruntime blocker resolved: embeddings moved to a fundamentals-api endpoint

- User picked "separate embedding service" over the WASM-backend spike.
- **fundamentals-api gains `POST /embed`** — `app/ingestion/embeddings.py` `embed_texts()` via **`fastembed`** (`BAAI/bge-small-en-v1.5`, 384-dim, L2-normalised — matches `EMBED_DIM` + the Atlas `dotProduct` index), lazy import, dim guard; `app/api/routes/embed.py` guarded by `IPO_INGEST_TOKEN`, 64-text batch cap. `requirements.txt` += `fastembed` (pulls `onnxruntime` CPU + `tokenizers`; ~64 MB quantised model downloads to `/tmp` once per instance). 7 pytest (mocked). `config.py` += `embed_model` / `fastembed_cache_dir`.
- **Next app:** `src/lib/rag/embed.ts` rewritten as a thin HTTP client to `${FUNDAMENTALS_API_URL}/embed` (`embedBatch`/`embedQuery` throw on failure → callers already fall back). **`@huggingface/transformers` removed** — also cleared its `adm-zip`/`sharp` high-sev advisories (`npm audit` → 0). 249 web tests green (embed.test.ts rewritten to mock `fetch`).
- Docs: `architecture.md` "Retrieval (RAG)" section + embeddings bullet, `data-sources.md` entry, ROADMAP blocker → `[x]`, memory `onnxruntime-vercel-blocker` updated to "resolved".
- **Deployed both:** `marketmitra-fundamentals-api` (`61ycogkw8`) — `/health` + `/indices` 200 (no regression from `fastembed`), `/embed` 401 (auth ok); `marketmitra-v2` (`rnnwlvglj`) — `/` 200, `index-corpus`/`notes`/`insights` all 401 not 500 (embed.ts HTTP-client loads clean).
- `CRON_SECRET` + `IPO_INGEST_TOKEN` already GitHub repo secrets → `index-corpus.yml` fires on schedule from `main`. Triggered a manual run (`gh workflow run index-corpus.yml`, run 34052075720) to bootstrap the Atlas Vector Search index (`ensureChunksIndexes()`) + first news/filings pass and exercise the full prod pipeline end-to-end.
- **Phase 10a is now functionally complete on both hosted + self-host.** Remaining: confirm the workflow run's result; then the archiving protocol; Phase 10b (research surface) still scoped-not-built.

## 2026-09-07 — Phase 10a RAG verified live on the hosted instance

- Two bugs found + fixed by running the real prod pipeline (`gh workflow run index-corpus.yml`):
  1. **News limit** — the indexer's default `newsLimit: 150` hit the fundamentals-api `/news` route's `le=50` validation → 422 → `getNews` returned EMPTY → first run saw 0 news. `fetchRecentNews()` now pages 50 at a time following `next_cursor` (`281691e`). _(Also learned: a stale `.next/` cache hid a test-only `tsc` error locally that Vercel's clean build caught — `rm -rf .next` before trusting `next build`.)_
  2. **fastembed on Vercel — "Read-only file system (os error 30)"** — `huggingface_hub`'s `snapshot_download` writes to `~/.cache/huggingface` by default and `$HOME` is read-only on Vercel. Set `HF_HOME` / `HF_HUB_CACHE` / `XDG_CACHE_HOME` under `/tmp` at module import; `maxDuration` 60→120 for the one-time ~18s model download (`79fa0d7`). Verified locally with a read-only-`$HOME` simulation.
- **Final index-corpus run:** `{"vectorIndex":"exists","news":{"seen":150,"changed":150,"pruned":0},"filings":{"seen":10,"indexed":0,"skipped":10},"errors":[],"ms":141152}`. **150 news docs chunked, embedded via the fundamentals-api `/embed` (fastembed), and written to the `chunks` collection — `errors: []`. RAG retrieval is live on the hosted instance.**
- **Filings still `skipped: 10`** — `GET bseindia.com/.../*.pdf` → `403 Forbidden` from Vercel's IP (same edge-blocking as NSE/Tier 1). `fetchPdfText` returns null → skipped, no error. Filings-in-corpus will populate from an un-blocked host (self-host in India, etc.). Not a regression — a known external limitation, documented like Tier 1.
- **Phase 10a is functionally complete on hosted + self-host.** `index-corpus.yml` runs every 2h on its own (repo secret already set). Remaining: Phase 10a archiving protocol; Phase 10b (research surface) still scoped-not-built.

## 2026-09-07 — Phase 10a archiving/context-maintenance protocol run

- Phase 10a signed off + verified live → ran the context-maintenance protocol (CLAUDE.md).
- **New archive** [`/docs/archive/rag-chat.md`](./archive/rag-chat.md) — full Phase 10a build detail: store/chunker/retrieval, the **onnxruntime-on-Vercel saga** (lazy import → file-tracing dead end → WASM spike → the `fastembed` `/embed` endpoint pivot), the two prod-only bugs (news `le=50` cap, read-only `$HOME`), agentic chat + history, grounded insights, the per-user layer, test coverage, follow-ups.
- **`/docs/architecture.md`** — "Retrieval (RAG)" section collapsed to a ~30-line summary + archive link; status header → "Phases 0–10a signed off and in production"; Phase 10a added to the phase list; stale "Open follow-ups" paragraph refreshed.
- **`CLAUDE.md`** — Current phase → "Phases 0–10a signed off + archived; Phase 10b scoped, not started"; Active focus → "No build in flight" with the `EMBED_DIM=384` lockstep note + non-blocking follow-ups.
- `session-log.md` at 12 entries — under the ~15-20 rollup threshold, left intact. `decisions/` / `data-sources.md` / `api-surface.md` untouched (living reference).
- **Next:** Phase 10b (research surface) or Phase 11 (multi-agent) — both need a scoping pass, neither started from assumptions.
