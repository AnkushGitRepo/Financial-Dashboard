# 0021: Phase 11 — multi-agent analytical briefings (TradingAgents-pattern, in-house)

Date: 2026-09-07
Status: accepted (scoping decision — no code written yet). The one open
item — orchestrator runtime — was **resolved by the user 2026-09-07: TS in
the Next app** (Part B as written). Build checklist: `ROADMAP.md` Phase 11.

## Context

Phase 11 in `ROADMAP.md` has always been "**building our own multi-agent
analysis pattern inspired by TauricResearch's architecture — not importing
their repo as a dependency**." The user supplied the repo
([TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents),
Apache-2.0) as the reference and asked to integrate the *pattern* into
MarketMitra. This ADR is the output of the scoping session.

### What TradingAgents is

A LangGraph (Python) pipeline:

1. **Analyst team** — Fundamentals, Sentiment, News, and Technical analysts
   each produce a report from their data slice.
2. **Researcher team** — a **bullish** and a **bearish** researcher debate
   the analysts' findings over N rounds.
3. **Trader** — turns the debate into a trade (timing + size).
4. **Risk Management + Portfolio Manager** — assess volatility/liquidity
   and approve or reject the position for **simulated execution**.
5. **Memory / reflection** — logs each trade's realised return and injects
   past lessons into future Portfolio-Manager prompts.

### Where it collides with MarketMitra, and how this ADR resolves it

- **The guardrail is non-negotiable.** Every AI surface here appends
  `GUARDRAIL` (`src/lib/ai/prompts.ts`): *"You do NOT give a buy / sell /
  hold recommendation, a price target, or an opinion on whether someone
  should invest … End every response with exactly: 'This is a synthesis of
  public data, not investment advice.'"* TradingAgents' entire output —
  steps 3–4 above — is exactly what the guardrail forbids. **Phase 11 ports
  steps 1–2 (+5), and stops before step 3.** No trader, no risk manager, no
  position, no simulated execution, ever.
- **Not a dependency.** We port the *pattern* (agent roles, the debate
  structure, the reflection loop) in our own code. No `pip install
  tradingagents`, no LangGraph-Python in the stack unless a new service is
  chosen (see open item).
- **BYO-key + cost.** A faithful run is 15–20+ LLM calls on the *user's*
  own provider key — minutes of wall time, real money. Phase 11 must be
  **explicitly opt-in, cost-signalled, and asynchronous** (a job, not a
  request that blocks).
- **Free data only** ([ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md)).
  No Alpha Vantage / FinnHub / StockTwits / Reddit / Polymarket / FRED. The
  agents reuse what exists: `services/fundamentals-api` (fundamentals,
  price history, shareholding, peers, docs), the RSS + VADER **news feed**,
  the **RAG corpus** (`retrieve()`), and the **MCP tools**.

### Relevant existing state

- **`src/lib/ai/`** — provider adapters (`providers.ts`), BYO-key
  resolution (`userAiConfig.ts` `getUserAiConfig`), `generate.ts`
  (`generateInsightText` non-streaming, `streamChat` + tool-calling loop),
  guardrailed prompts (`prompts.ts`). All in TypeScript.
- **`services/fundamentals-api`** is scoped for **data + embeddings only**
  ([ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md),
  [0013](./0013-fundamentals-api-vercel-hosting.md)) — it has **no LLM
  code** and adding an orchestrator there would break that scope.
- **`src/lib/rag/`** — `retrieve()` over the corpus; `insightContext.ts`
  `retrieveInsightGrounding()`. **`src/lib/mcp/tools.ts`** — 7 read-only
  data tools already adapted for AI-SDK tool use in `chatTools.ts`.
- **Phase 10b** (`/dashboard/research`, `POST /api/research`) is the
  shallow version of this — one retrieval pass + one synthesis. Phase 11 is
  the deep, debated version.
- **No technical-indicator computation** anywhere yet — the "technical
  analyst" works from raw `/prices` history (or a handful of indicators
  computed in the orchestrator).
- **No job/queue infrastructure.** The cron routes (`evaluate-alerts`,
  `index-corpus`) are the only async pattern — a token-guarded route hit by
  a schedule.

### Scoping answers (user)

1. **Pipeline → Analyst team + bull/bear debate + synthesis.** The full
   analytical half (steps 1–2), not a trimmed version.
2. **Runtime → "choose the best approach."** Recommendation below.
3. **Output → a debated briefing that may state a *direction*, with the
   disclaimer.** The synthesiser may say which side of the debate is
   better-evidenced and why; it must still not recommend an action, give a
   target, or opine on whether to invest, and it still ends with the
   guardrail line. See "The direction boundary" below.
4. **Memory → full reflection loop in v1.** Store runs, compare what the
   debate emphasised against the stock's later move, generate lessons,
   inject them into future runs.

## Decision

Phase 11 = **`POST /api/agents/run`** kicking off an asynchronous,
checkpointed multi-agent run over one **stock** (`{ symbol }`), whose
result is a **debated analytical briefing**. Three parts:

### Part A — the agent pipeline (`src/lib/agents/`)

A fixed DAG, not a dynamic graph. All agents are `generateInsightText`
calls with role-specific `AGENT_*_SYSTEM` prompts (each carrying
`GUARDRAIL`) and a data context the orchestrator assembles.

1. **Analysts (parallel):**
   - **Fundamentals** — ratios, financial-statement trend, shareholding,
     peers (from `fundamentalsApi`).
   - **News & sentiment** — the news feed for the symbol (+ VADER tone) and
     `retrieve({ docTypes: ['news','filing'], symbol })`.
   - **Technical** — `/prices` history; a few indicators (SMA/EMA cross,
     RSI, drawdown) computed in the orchestrator, described not charted.
   - **Macro / context** — broad-market news + indices, framed as backdrop.
   Each returns a short structured report.
2. **Debate (sequential, N rounds, default 2):** a **bull** agent and a
   **bear** agent alternate, each seeing the analyst reports + the other's
   last turn. They argue the *analysis*, not a trade.
3. **Synthesis:** a "research lead" agent writes the final briefing —
   sections: *bull case / bear case / where they agree / key uncertainties
   / what would change the picture*, then a **"where the evidence
   currently leans"** paragraph (the permitted "direction"), then the
   guardrail line.

Reused wholesale: `getUserAiConfig` (BYO key; hosted never uses an
operator key for a per-user surface), the `fundamentalsApi` / news /
`retrieve` clients, `normalizeAiError`. New: the prompts, the orchestrator,
the indicator maths.

### Part B — asynchronous, checkpointed runs (TS, in the Next app)

**Recommended runtime: TypeScript in the Next app, no new service.** A
full run can exceed a single function's `maxDuration`, so it is a **job**:

- **`agentRuns` collection** — `{ _id, userId, symbol, status
  (queued|running|done|error), phase, priceAtRun, analystReports,
  debateTurns, briefing, model, error, createdAt, updatedAt,
  reflection? }`. This doc **is** the checkpoint: the orchestrator writes
  after each phase, so a resumed invocation continues from `phase`.
- **`POST /api/agents/run`** — auth, `getUserAiConfig` (400 `no_ai_key`),
  `ai` rate-limit tier, a one-run-in-flight-per-user guard, resolves the
  symbol, creates the doc `queued`, kicks the worker (fire-and-forget /
  `waitUntil`), returns `{ id }`.
- **Worker** — `POST /api/agents/tick` (internal, `CRON_SECRET` bearer, or
  a direct internal call): loads a `queued|running` doc, runs the **next
  phase**, persists, and if not `done` re-invokes itself. Bounded per
  invocation → never hits `maxDuration`. A `.github/workflows/agents-tick.yml`
  safety-net schedule sweeps stuck runs (like `index-corpus.yml`).
- **`GET /api/agents/run/[id]`** — the caller polls: `{ status, phase,
  briefing? }`. Owner-scoped.
- **`/dashboard/agents`** — a new surface: symbol input → "Run analysis"
  (with a plain-language "this makes ~15–20 calls on your AI key and takes
  a few minutes" note) → a live phase indicator → the rendered briefing
  (`MarkdownLite`). Past runs are **not** listed for the user (ephemeral to
  them); they persist only for reflection (Part C). "Agents" nav item.

*Why not a Python/LangGraph service:* it would duplicate the BYO-key
handling, provider adapters, and guardrail prompts that already live in
TS; add a third Vercel project + deploy target; and LangGraph's
graph/checkpoint machinery is overkill for a fixed 3-stage DAG whose
checkpoint is just the `agentRuns` doc. *Why not `@langchain/langgraph`
(JS):* a large dependency for the same reason. **If the user prefers the
Python route despite this, that's the one open item to settle.**

### Part C — the reflection loop

- Every finished run stores `priceAtRun` and the debate's emphasised
  points (the synthesiser tags 2–4 "key claims" as structured output).
- **`POST /api/cron/agents-reflect`** (`CRON_SECRET`, a
  `.github/workflows/agents-reflect.yml` schedule, e.g. daily): finds runs
  `done` and older than a **reflection horizon** (default 21 days) with no
  `reflection` yet, pulls `/prices` since `createdAt`, and asks an LLM
  (the run owner's key) to write **lessons** — "the bear case leaned on X,
  which the price action since does / doesn't bear out." Stored on the
  doc.
- **Injection:** a new run calls `retrieve()`-style logic over recent
  `reflection` lessons — same-symbol first, then sector — and passes the
  top few into the debate + synthesis prompts as "lessons from past
  analyses (calibration only, not predictions)".
- Lessons are **per-user** (they're generated with that user's key and
  reflect their runs). No cross-user pooling.
- Honest caveat baked into the prompts and the UI: this is *calibration of
  the analysis process*, not a track record or a predictive signal, and
  21 days is a short, arbitrary horizon.

### The direction boundary (hard)

The synthesiser's "where the evidence currently leans" paragraph **may**:
say which side of the debate is better supported and on which specific
points ("the bear case is better evidenced on the margin trend; the bull
case rests on a capex cycle not yet visible in results"); report that a
metric is high/low **versus peers or its own history** as a fact.

It **must not**: recommend buying, selling, holding, trimming, or adding;
give or imply a price target or fair value; state the stock is over- or
under-valued as a *conclusion*; say what the reader should do; express
confidence as a probability of a price move. `GUARDRAIL` still appends
verbatim and the "not investment advice" line still ends every briefing.
The `AGENT_SYNTHESIS_SYSTEM` prompt spells this out; the API also
runs a lightweight post-check that rejects a briefing containing
obvious trade-action phrasing and regenerates once.

## Consequences

- **New:** `src/lib/agents/` (orchestrator + prompts + indicator maths),
  `agentRuns` Mongo collection, three `/api/agents/*` routes + one cron
  route, two GitHub Actions workflows, `/dashboard/agents` + nav item,
  `AGENT_*_SYSTEM` prompts. Reuses all existing AI / data / RAG infra.
- **Cost & latency are the user's** — surfaced up front; a per-user
  one-in-flight guard and the `ai` rate tier bound abuse. No operator-key
  path (per-user surface).
- **Degradation:** any analyst whose data is unavailable returns "no data
  for this slice" and the debate proceeds with what it has; retrieval
  unavailable → the news/sentiment analyst works from the live feed only;
  a generation failure fails the run with a clear `error`, no partial
  charge beyond the calls already made.
- **`fundamentals-api` untouched** — its no-LLM scope holds.
- **Self-host:** identical — BYO key, the same two services, the schedules
  run from `main`. No new external dependency.
- Phase 11 is the deep sibling of Phase 10b; `/dashboard/research` stays
  the fast one.

## Explicitly out of Phase 11 scope

- Any trade decision, position, sizing, risk-manager, or simulated
  execution — steps 3–4 of TradingAgents. Not now, not later.
- Price targets, fair-value estimates, over/under-valued verdicts.
- A LangGraph dependency (Python or JS) unless the open item flips.
- Cross-user memory / a shared "track record" / leaderboards.
- Real-time or streaming agent output — the run is a job with a polled
  result; the briefing renders once.
- More than one subject type in v1 (stock only — no theme/portfolio/
  comparison runs; that's Phase 10b's job at the shallow tier).
- Backtesting or any historical-simulation harness.

## Resolved (was the open item)

- **Orchestrator runtime → TS in the Next app** (Part B as written). No
  Python/LangGraph service; the `agentRuns` doc is the checkpoint.
