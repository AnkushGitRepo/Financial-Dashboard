# Archive — Multi-agent analytical briefings (Phase 11)

Scoped in [ADR 0021](../decisions/0021-phase-11-multi-agent-analysis.md); built on branch
`phase-11-agents`, merged to `main`/`v2` 2026-09-12. Tests green (325 web tests / `tsc` /
lint / `next build`) and **verified with a real live end-to-end run** against TCS in
self-host mode — analyst panel → 2-round bull/bear debate → synthesis all completed with
no errors and rendered a correct briefing. **Not yet deployed to production.** Live summary
in [`/docs/architecture.md`](../architecture.md); per-endpoint reference in
[`/docs/api-surface.md`](../api-surface.md).

## What shipped

Ports the **analytical half** of [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)
(Apache-2.0) as our own TypeScript code — not a dependency — and **stops before any trade
decision**: no trader, no risk manager, no position, no simulated execution. The guardrail
(`GUARDRAIL` in `src/lib/ai/prompts.ts`) forbids exactly what TradingAgents' steps 3–4 do.

### Part A — the pipeline (`src/lib/agents/`)

- **Four analyst agents**, parallel, each only its data slice, no-data roles skip the LLM:
  fundamentals (ratios/financials/shareholding/peers), news+sentiment+retrieval, technical
  (`indicators.ts` — SMA/EMA/RSI/drawdown/MA-cross computed in the orchestrator, described
  not charted), macro/context.
- **Bull vs bear debate**, 2 rounds sequential — bear sees the fresh bull turn + all prior.
- **Synthesis** — a "research lead" briefing: bull case / bear case / where they agree / key
  uncertainties / what would change the picture / **where the evidence currently leans**
  (the one permitted "direction" — never a recommendation, target, or valuation verdict).
- `tradeActionCheck.ts` `scanForTradeActions()` — a regex guard; `runSynthesis` regenerates
  once if a briefing drifts into trade-action phrasing.
- All calls go through `generateInsightText` (BYO key, guardrailed). 61 tests across
  `context`/`indicators`/`orchestrator`/`tradeActionCheck`.

### Part B — asynchronous, checkpointed runs

- **`agentRuns` collection is the checkpoint** — `store.ts`: create/get/patch,
  `claimNextRun` (atomic, advisory lock + stale-lock recovery), `userHasActiveRun`.
- **`POST /api/agents/run`** — auth, `getUserAiConfig` (400 `no_ai_key`), `ai` rate tier,
  one-in-flight-per-user guard (409), symbol check (502 if unresolvable), captures
  `priceAtRun`, creates the run, `after()` fire-and-forget kicks the first tick, returns
  `202 { id }`.
- **`POST /api/agents/tick`** — `CRON_SECRET` bearer, `claimNextRun`, `advanceRun()` runs
  **one phase per invocation** (analysts → one debate round → synthesis), persists, and
  self-chains via `after()` until done. Bounded per call, never hits `maxDuration`.
  `.github/workflows/agents-tick.yml` (every 5 min) sweeps stuck runs.
- **`GET /api/agents/run/[id]`** — owner-scoped poll → `{ status, phase, briefing? }`.
- **`/dashboard/agents`** — symbol input + a plain-language "~15–20 calls on your key, a
  few minutes" cost note → phase indicator (polls every 4 s) → `MarkdownLite` briefing. One
  run in flight per user; runs aren't listed (ephemeral to the user).

### Part C — the reflection loop

- **`POST /api/cron/agents-reflect`** (daily workflow) — `reflect.ts` `reflectOnRun()`
  finds `done` runs older than the reflection horizon (~21 days) with no reflection yet,
  pulls the price move since `createdAt`, and asks an LLM (the run owner's key) to write
  hindsight **lessons** comparing the debate's tagged key claims to what happened. Framed
  explicitly as calibration, never a verdict or track record. Runs older than 120 days are
  pruned.
- **Injection** — `lessons.ts` `buildLessonsContext()` (same-symbol first, then sector, ≤3
  runs) folds into `doc.lessonsContext`; the analysts phase resolves it, debate + synthesis
  pass it through as "lessons from past analyses (calibration only, not predictions)".
  Lessons are per-user — no cross-user pooling.

## The direction boundary (hard)

The synthesis **may** say which side of the debate is better-evidenced and on which
specific points, and report a metric as high/low versus peers or its own history as a
fact. It **must not** recommend an action, give or imply a price target, declare over/under
valuation as a conclusion, say what the reader should do, or express a probability of a
price move. `GUARDRAIL` still appends verbatim; `scanForTradeActions` is the automated
backstop.

## Verified live run (2026-09-12)

Ran a real analysis against `TCS` in self-host mode with a live Gemini key, driven through
the actual `/dashboard/agents` UI (not a test double): all three phases ticked to
completion with no errors and rendered bull case / bear case / agreement points / key
uncertainties / what-would-change-the-picture / where-the-evidence-leans, correctly
stopping short of a buy/sell/hold call, with the "not investment advice" guardrail line
present. This was the first real end-to-end confirmation of the ADR 0021 pipeline (prior
verification was 325 unit/integration tests only).

One environment-only gap surfaced during this test, not a code bug: a local
`FUNDAMENTALS_API_URL` pointed at a `services/fundamentals-api` instance that wasn't
running locally (it needs a local Postgres) → `getCompany()` returned `null` → the first
`POST /api/agents/run` attempt 502'd. Worked around for the test by pointing at the
hosted fundamentals-api; not a change to the shipped code or its config contract.

## Cost, degradation, self-host

Cost and latency are the user's (BYO key) — no operator-key path, since this is a per-user
surface. Any analyst with no data degrades to "no data for this slice" and the debate
proceeds with what it has; retrieval unavailable → the news/sentiment analyst falls back to
the live feed only; a generation failure fails the run with a clear `error`. Self-host is
identical to hosted — same two services, same schedules firing from `main`, no new external
dependency, no operator key.

## Out of scope (still true)

Any trade decision / position / risk-manager / simulated execution; price targets or
valuation verdicts; a LangGraph dependency; cross-user memory; streaming agent output;
non-stock subjects (theme/portfolio/comparison stay Phase 10b's shallow tier); backtesting.

## Follow-ups (non-blocking)

- Deploy to production (Vercel) — merged to `main`/`v2`, not yet deployed.
- A second live run on a different symbol/sector wouldn't hurt, but the pipeline mechanics
  (checkpointing, self-chaining ticks, phase transitions) are now confirmed working.
