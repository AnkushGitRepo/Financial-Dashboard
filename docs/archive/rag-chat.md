# Archive — Retrieval (RAG) for chat + insights (Phase 10a)

Scoped in [ADR 0020](../decisions/0020-phase-10-rag-chat.md); built on branch
`phase-10-rag`, signed off, merged to `main`/`v2`, deployed and **verified live on the
hosted instance 2026-09-07** (150 news docs embedded into the corpus, `errors: []`). Live
summary in [`/docs/architecture.md`](../architecture.md); per-endpoint reference in
[`/docs/api-surface.md`](../api-surface.md).

Phase 10b (a dedicated `/dashboard/research` surface) is scoped in ADR 0020 but **not
built**.

## What shipped

A retrieval layer under the existing AI surfaces. Nothing is load-bearing: every piece
**degrades to the exact pre-Phase-10 behaviour** when vector search or the embedding
service is unavailable (`retrieve()` returns `null`, insight grounding is empty, chat falls
back to its data tools).

### Store — `src/lib/rag/chunks.ts`

One `chunks` collection + an Atlas Vector Search index (`vectorSearch`, `dotProduct`,
384-dim, filter fields `userId` / `docType` / `symbol`), created idempotently by
`ensureChunksIndexes()` (degrades to `vectorIndex: 'unavailable'` on a non-Atlas MongoDB).
Two partitions by `userId`:

- `userId: null` — shared public corpus (news, filings), indexed once.
- `userId: "<clerk id>"` — that user's private layer (notes, holdings snapshot, recent
  chat questions), strictly filtered on every read.

`ChunkDoc`: `source` + `chunkIndex` (unique), `text`, `vector`, `docType`
(`news`|`filing`|`note`|`holdings`|`chat`), `userId`, `symbol`, `sourceUrl`, `title`,
`hash` (sha256 of `source ∥ chunkIndex ∥ text`), `publishedAt`, timestamps.
`replaceSourceChunks()` upserts by `(source, chunkIndex)`, prunes trailing windows from a
shorter re-index, and **writes nothing when the content hash is unchanged**.
`deleteSourceChunks` / `deleteUserChunks` for retractions and account deletion.

### Chunker — `src/lib/rag/chunk.ts`

Pure. Char-budget windows (default 2400 / 300 overlap ≈ 600 / 75 tokens), sentence +
paragraph boundary aware, overlap carry between windows, tiny-tail merge bounded by the
ceiling, CRLF / blank-run normalisation.

### Embeddings — the onnxruntime saga

**Design intent (ADR 0020):** local embeddings via `@huggingface/transformers`, no API key,
so BYO-key stays limited to *generation* and the feature works identically hosted +
self-host.

**What actually happened on deploy:**

1. `@huggingface/transformers` → `onnxruntime-node` **can't load `libonnxruntime.so.1` in
   Vercel's Node serverless runtime**. A static top-level import in `embed.ts` 500'd every
   route that transitively imports it (chat, insights, notes, holdings, `/api/cron/
   index-corpus`) at cold start. → made the import lazy (`await import()` inside
   `getPipeline()`), so the failure throws at embed time and `retrieve()` / the indexer
   catch it (`4fa2664`).
2. `outputFileTracingIncludes` to bundle the `.so` → deploy failed: **"No more than 12
   Serverless Functions on the Hobby plan"** (per-route tracing keys de-grouped the API
   functions). Reverted (`e5529cb`).
3. The **WASM-backend** alternative was investigated and found to be a multi-hour bundler
   spike, not a config change: `@huggingface/transformers` is a Next built-in
   `serverExternalPackages` entry so its `require('onnxruntime-node')` runs at runtime
   uncontrolled by bundler aliases; `onnxruntime-node/binding.js` loads the `.node` addon
   at module-eval (so the `globalThis[Symbol.for("onnxruntime")]` hatch can't intercept);
   an npm `overrides` redirect to `onnxruntime-web` still lands in transformers.js's Node
   code path, which hardcodes `defaultDevices=['cpu']` with no `wasm` in `supportedDevices`.

**Resolution — a separate embedding service (`a9f988d`):**

- `services/fundamentals-api` gained **`POST /embed`** (`app/api/routes/embed.py` +
  `app/ingestion/embeddings.py`): `fastembed` with `BAAI/bge-small-en-v1.5` (384-dim,
  L2-normalised → dot product = cosine), lazy import, dim guard, `IPO_INGEST_TOKEN` bearer,
  64-text batch cap. `fastembed` → `onnxruntime` (CPU) works fine in Vercel's **Python**
  runtime. Model (~64 MB quantised ONNX) downloads to `/tmp` once per function instance.
- `src/lib/rag/embed.ts` is now a thin HTTP client to `${FUNDAMENTALS_API_URL}/embed`.
  `embedBatch` / `embedQuery` **throw** on any failure — callers already treat that as "no
  retrieval". `@huggingface/transformers` removed from the Next app (also cleared its
  `adm-zip` / `sharp` high-sev advisories; `npm audit` → 0).
- Self-host runs both services, so the path is identical there.
- **`EMBED_DIM = 384`** must stay in lockstep across `embed.ts`, `embeddings.py`, and the
  Atlas index def in `chunks.ts`.

**Two more bugs, found by running the real prod pipeline (`gh workflow run
index-corpus.yml`):**

- News limit — the indexer's default `newsLimit: 150` hit the fundamentals-api `/news`
  route's `le=50` validation → 422 → `getNews` returned EMPTY → first run saw 0 news.
  `fetchRecentNews()` now pages 50 at a time following `next_cursor` (`281691e`). _(Also:
  a stale `.next/` cache hid a test-only `tsc` error locally that Vercel's clean build
  caught — `rm -rf .next` before trusting `next build`.)_
- `fastembed` first prod run → **"Read-only file system (os error 30)"**:
  `huggingface_hub`'s `snapshot_download` writes to `~/.cache/huggingface` by default and
  `$HOME` is read-only on Vercel. Set `HF_HOME` / `HF_HUB_CACHE` / `XDG_CACHE_HOME` under
  `/tmp` at module import (before `huggingface_hub` loads); `maxDuration` 60 → 120 for the
  ~18s one-time download (`79fa0d7`). Verified with a read-only-`$HOME` simulation.

**Final verification run:** `{ vectorIndex: "exists", news: { seen: 150, changed: 150,
pruned: 0 }, filings: { seen: 10, indexed: 0, skipped: 10 }, errors: [], ms: 141152 }`.

### Indexer — `src/lib/rag/indexer.ts` + `POST /api/cron/index-corpus`

`CRON_SECRET` bearer (dev-open, prod-503), `maxDuration` 300, `?indexesOnly=1` for
self-host index setup, `?newsLimit=`. `.github/workflows/index-corpus.yml` curls it every
2 h (repo secret already set → fires from `main`).

- **News:** `fetchRecentNews()` (paged) → per item `indexTextDocument()` (chunk →
  `embedBatch` in 32s → `replaceSourceChunks` under `userId: null`, no-op on unchanged) →
  prune news chunks older than 45 days. Per-item errors collected; the run still finishes.
- **Filings:** `indexFilings()` — per symbol (`RAG_FILING_SYMBOLS` or a 10-name Nifty
  default) → `getDocuments()` → newest annual report → skip if `{source, publishedAt}`
  already indexed → `fetchPdfText()` (`src/lib/rag/pdfTextClient.ts` → the fundamentals-api
  `POST /documents/extract-text`, which uses `pdfplumber` — [ADR 0013
  amendment](../decisions/0013-fundamentals-api-vercel-hosting.md)) → `indexTextDocument`.
  `maxFilings` 3/run, `filingMaxPages` 120.
  - **Known limitation:** BSE returns `403` to Vercel's IP for the annual-report PDFs (same
    edge-blocking as NSE / Tier 1), so on the hosted deploy `filings.indexed` stays 0
    (`skipped`, no error). Populates from an un-blocked host (a self-hoster in India, etc.)
    — documented like Tier 1. News is the live corpus for now.

### Retrieval — `src/lib/rag/retrieve.ts`

`retrieve({ query, userId, docTypes?, symbol?, limit?, numCandidates?, minScore? })` →
`embedQuery` → `$vectorSearch` (index `chunks_vector`) + `vectorSearchScore` projection
over `{ userId: { $in: [null, caller] } }` (+ `docType $in`, + `symbol $or null` under
`$and`) → `minScore` post-filter. **Returns `null` — never throws** — on embed failure,
empty vector, or an aggregation error (non-Atlas, missing index). `buildRetrievalFilter`
is exported + unit-tested.

### Agentic chat — `POST /api/ai/chat`

Reworked into a tool-calling loop (`streamChat` gained `{ tools, maxSteps }` →
`stopWhen: stepCountIs(5)`; `generate.ts`). `src/lib/ai/chatTools.ts` `buildChatTools(userId)`
adapts all 7 `src/lib/mcp/tools.ts` entries to AI SDK `tool()` (thrown errors → `{error}`)
plus **`search_context`** over `retrieve()` (returns `{ available: false }` when the corpus
is unreachable → the model falls back to the live-data tools). New `CHAT_SYSTEM_AGENTIC`
prompt — guardrail intact (no buy/sell/hold, "not investment advice"). `formatChatContext`
kept as a small always-present portfolio seed. `maxDuration` 60 → 120. `toTextStreamResponse()`
unchanged — tool steps stay server-side.

Chat stopped being stateless: `src/lib/chat/chatHistory.ts` `appendTurn` (stores
user + assistant, prunes past a 100/user rolling cap, never throws), `recentUserQuestions`,
`clearHistory`. The route's `onFinish` persists each completed turn and
`void syncRecentChat(userId, recentUserQuestions())` re-embeds the user's recent questions
as `chat:<userId>`. **`DELETE /api/ai/chat`** clears history + drops the corpus entry.
A "clear history" control in the widget is an open follow-up.

### Grounded insights

`src/lib/rag/insightContext.ts` `retrieveInsightGrounding()` (never throws; empty grounding
when retrieval is unavailable → the insight generates exactly as pre-Phase-10). Wired into
all three routes: stock (`news` + `filing`, symbol-scoped), portfolio (`news` + `note`,
user-scoped), IPO (`filing` + `news`, shared `userId: null`). `insightPrompts.ts` builders
gained an optional `grounding` field rendered as a labelled block; the IPO builder uses it
as the DRHP stand-in when `drhpExtract` is null (full-DRHP text still needs a URL source).
**Cache invalidation:** the retrieved passages are folded into the hashed `input`, so a
re-index that changes retrieval regenerates the insight — no separate version marker.

### Per-user layer

- `src/lib/notes/userNotes.ts` — `userNotes` collection (title / body / optional symbol,
  trim + truncate, 200/user cap) + `GET|POST /api/notes` + `PATCH|DELETE /api/notes/{id}`
  (owner-scoped). `/dashboard/notes` page + `NotesPageClient` (inline create / edit /
  delete) against the design system; "Notes" nav item.
- `src/lib/rag/userSync.ts` — `syncUserNote` / `removeUserNote` / `syncUserHoldings` /
  `syncRecentChat` / `resyncUserHoldings`. Chunk → embed → `replaceSourceChunks` under the
  caller's `userId` (`note:<id>`, `holdings:<userId>`, `chat:<userId>`). **Every function
  swallows its errors and returns a boolean** — a sync failure never fails the originating
  write. Fired `void` from the notes routes and every holdings mutation.

## Test coverage

250 web (`vitest`) + 100 fundamentals-api (`pytest`) green at sign-off. New suites: `chunk`,
`embed` (HTTP client, mocked `fetch`), `chunks`, `retrieve`, `indexer`, `pdfTextClient`,
`insightContext`, `chatTools`, `insightPrompts`, `userNotes`, `userSync`, `chatHistory`;
Python `test_embed`, `test_pdf_text`.

## Follow-ups (non-blocking, in `ROADMAP.md`)

- README self-host note for the RAG env (`FUNDAMENTALS_API_URL` reachable from the app,
  `IPO_INGEST_TOKEN` shared between the two services).
- Pre-bundle the embedding model into the deployment to kill the ~18s cold-instance
  download.
- Filings-in-corpus needs an un-blocked PDF host, or a DRHP-URL source for the IPO briefs.
- A "clear chat history" control in the chat widget.
- Phase 10b — the dedicated research surface.
