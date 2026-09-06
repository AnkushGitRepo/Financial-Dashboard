# 0020: Phase 10 — AI chat + insights with retrieval (RAG)

Date: 2026-09-06
Status: proposed (scoping decision — no code written yet; two open questions flagged below need the user's confirmation before the build checklist is final)

## Context

Phase 10 in `ROADMAP.md` was marked ❓ with three open threads: what's in
the retrieval corpus, which vector store, and how retrieval is scoped
per-user vs. general market knowledge. This ADR is the output of the
dedicated scoping session.

### Relevant existing state

- **Mitra chat** (`POST /api/ai/chat`, [ADR 0018](./0018-ai-insights-scope.md))
  has **no retrieval**. `src/lib/ai/chatContext.ts` `formatChatContext`
  builds a fixed blob — portfolio summary + per-holding P&L + merged recent
  news headlines — and `CHAT_SYSTEM` tells the model "use only the context."
  It streams plain-text tokens (`streamText` → `toTextStreamResponse()`,
  Node runtime). It is **stateless** — no chat history is persisted.
- **AI insights** — four cached surfaces (stock read, portfolio insight,
  IPO brief, chat). `src/lib/insights.ts` `getOrGenerate`. The IPO brief
  already has a `drhpExtract: null` seam; DRHP grounding was deferred
  ([ROADMAP](../../ROADMAP.md) Phase 8 follow-ups).
- **BYO-key, always** — no MarketMitra-supplied model access, for any phase.
  Generation uses the user's provider key (`src/lib/ai/userAiConfig.ts`
  `getAiConfig`); self-host may use an `AI_*` env key, hosted per-user
  surfaces never use an operator key.
- **MongoDB Atlas** is the main-app database (native driver, no Mongoose,
  [ADR 0007](./0007-mongodb-native-driver.md)). Atlas Vector Search is
  available on **all cluster tiers including the free M0**. No other
  datastore in the main app.
- **MCP tool layer** (`src/lib/mcp/`, [ADR 0019](./0019-phase-9-api-surface-mcp-rate-limiting.md))
  — 7 read-only data tools (symbol search, quote, fundamentals, price
  history, news, IPOs, indices). CLAUDE.md names this "the natural
  foundation for Phase 10/11 — those can call the tools rather than
  re-plumb data access."
- **Deployment-mode gate** ([ADR 0010](./0010-deployment-mode-gate.md)) —
  RAG is a **feature**, not a hosted-only concern like rate limiting. It
  must work in self-host with no extra infrastructure beyond the user's
  existing MongoDB.
- **Data sourcing is free-libraries-only** ([ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md)),
  identically in hosted and self-hosted mode. No paid vector DB, no paid
  embedding API as a hard dependency.

### Scoping answers (user)

1. **Corpus → all four categories:** the news archive, filings &
   fundamentals (annual-report PDFs, DRHP text, Screener data), the user's
   portfolio & notes, and structured market data.
2. **Vector store → MongoDB Atlas Vector Search + local embeddings** — a
   bundled small embedding model (transformers.js), no embedding API key
   required. Keeps BYO-key limited to *generation* and keeps self-host
   zero-config.
3. **Scope → per-user isolation** (see open question A — the user picked
   "per-user everything"; this ADR proposes a reconciliation that keeps the
   privacy guarantee without per-user copies of public documents).
4. **Surfaces → all three:** the Mitra chat widget, the insight surfaces
   (incl. DRHP-grounded IPO briefs), and a new dedicated research surface
   (see open question B — proposed as Phase 10b).

## Decision

### Retrieval architecture

- **Store:** a new `chunks` collection in Atlas with an Atlas Vector Search
  index (`vectorSearch` type, cosine, plus scalar filter fields
  `docType`, `symbol`, `userId`, `publishedAt`). One collection, one index;
  filters do the scoping.
- **Embeddings:** local, via `transformers.js` running on the Node runtime.
  Model: a small sentence-embedding model (~90–130 MB, e.g.
  `Xenova/bge-small-en-v1.5` or `Xenova/all-MiniLM-L6-v2` — final pick in
  the build, criterion: quality-per-MB and cold-start load time). The model
  file is cached on the function's ephemeral disk after first load. **No
  embedding API key, ever** — same code path hosted and self-host.
- **Indexing runs as scheduled jobs, never inline in a request** —
  following the existing `evaluate-alerts` / `refresh-ipos` cron pattern
  (GitHub Actions → a token-guarded route). Chunking: ~500–800 token
  windows with overlap; PDF text extraction reuses the fundamentals-api
  path (it already has `pdfplumber` available there — do the extraction in
  that service, ship plain text to the Next app for chunking + embedding).
- **Retrieval at query time:** embed the query locally → `$vectorSearch`
  with the scope filter → top-k chunks → assembled into the prompt context,
  replacing (chat) or augmenting (insights) today's fixed blob.
- **Structured market data is NOT embedded.** "Retrieve over structured
  data" resolves to: the chat model gets **tool access to the MCP layer**
  (`streamText` with `tools:` wired to `src/lib/mcp/tools.ts`) and
  tool-calls for live quotes/ratios/shareholding. Vectorizing constantly-
  changing numbers is the wrong tool. This makes Phase 10 chat *agentic*
  (tool-calling loop) rather than a single completion.
- **Graceful degradation:** if no vector index is configured / reachable,
  chat falls back to the current `formatChatContext` blob and insights
  generate as they do today. RAG never being available must not break an
  existing surface. Self-host with a stock Atlas cluster gets RAG for free;
  a non-Atlas MongoDB (no Vector Search) falls back.

### Corpus scoping (proposed reconciliation — open question A)

The user picked "per-user everything." Applied literally that means each
user gets their own embedded copy of every news article and annual-report
PDF — which on Atlas M0 (512 MB, shared) is exhausted by a handful of users
and re-runs the same CPU embedding work per user for public documents.

**Proposed instead:** two logical partitions in the one `chunks` collection,
which delivers the same privacy guarantee:

- **Shared market corpus** (`userId: null`) — news archive, filings &
  fundamentals text, IPO/DRHP text. Public data, indexed once, readable by
  every user's retrieval. No user-specific content ever lands here.
- **Per-user corpus** (`userId: "<id>"`) — the user's holdings snapshot,
  their saved notes, and (new) their chat history. Strictly filtered by
  `userId` on every query; never shared; deleted with the user.

Every retrieval query pulls from `{ userId: null } ∪ { userId: <caller> }`.
Nothing user-specific is ever visible to another user. If the user truly
wants zero shared index (full per-user duplication) despite the free-tier
cost, that's the alternative — **needs an explicit call.**

### Surfaces (open question B — proposed phasing)

- **Phase 10a** — retrieval plumbing + the two grounded surfaces:
  1. Chat: swap prompt-stuffing for retrieval + MCP tool-calling.
  2. Insights: retrieval-augment the stock read, portfolio insight, and
     IPO brief; the IPO brief pulls real DRHP passages (**absorbs the
     deferred "DRHP grounding" follow-up** — that item closes with 10a).
- **Phase 10b** — the dedicated research surface: a new
  `/dashboard/research` page + route, multi-step retrieval, longer-form
  output, its own UI against the design system. Meaningfully more scope
  (new page, new UX); split so 10a can ship and be validated first.

### New persistent state

- `chunks` collection (text + vector + filter fields) — the index.
- `userNotes` collection — user-authored notes fed into the per-user
  corpus. New small CRUD + UI surface (`/dashboard/settings` or a notes
  panel — decide in the build).
- `chatMessages` collection — chat history, needed because "saved
  questions" is now a corpus input. Adds a retention decision (proposed:
  keep N most recent per user, or a rolling window; user-clearable).
  Chat stops being stateless.

## Consequences

- **New dependency:** `@xenova/transformers` (or `@huggingface/transformers`)
  in the Next app — pure-JS/WASM, no native build, MIT/Apache. Adds ~model
  weight to cold starts on the routes that embed; mitigated by keeping
  embedding on the cron-indexer and a single lightweight query-embed call
  per chat turn.
- **New cron job:** a corpus indexer (news + filings), token-guarded route
  + a GitHub Actions schedule, same pattern as the two existing schedulers.
- **fundamentals-api** gains a "return extracted PDF text" endpoint (the
  PDF→text step stays on the Python side where `pdfplumber` already lives;
  the Next app never imports a PDF library).
- **Chat becomes agentic** — tool-calling loop, so latency and token use
  per turn go up; the BYO-key guardrails (`CHAT_SYSTEM`, "not investment
  advice", no buy/sell/hold) carry over unchanged and must be re-asserted
  in the tool-calling prompt.
- **Atlas free-tier storage** is the real constraint on the hosted
  instance — the shared-corpus reconciliation (open question A) exists to
  stay inside it. Corpus size caps (retention windows on news, dedupe on
  filings) are a build concern.
- **No paid tier, no paid infra** — preserved. Local embeddings + Atlas
  Vector Search on the tier already in use.
- Phase 11 (multi-agent) builds on 10a's tool-calling chat + retrieval.

## Explicitly out of Phase 10 scope

- Any paid vector DB or hosted embedding API as a hard dependency.
- Fine-tuning or a MarketMitra-hosted generation model — BYO-key stays.
- Real-time / streaming index updates — scheduled batch indexing only.
- Cross-user or "community" knowledge sharing.
- Re-ranking models, hybrid BM25+vector fusion — start with vector +
  scalar filters; revisit if retrieval quality is short.

## Open questions for the user

- **A. Corpus scoping.** Confirm the shared-public-corpus + per-user-private
  reconciliation above, or insist on full per-user duplication (accepting
  the Atlas free-tier storage hit).
- **B. Surface phasing.** Confirm the 10a (chat + insight grounding) /
  10b (dedicated research surface) split, or require all three surfaces in
  one phase.
