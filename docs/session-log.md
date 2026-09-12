# Session Log

Rolling log of work sessions, most recent first is NOT required — append chronologically (oldest first, newest at bottom), read the **last 3 entries** to catch up. When this file grows past ~15-20 entries, the oldest get rolled up into `/docs/archive/session-log-archive.md` (see the context maintenance protocol in `/CLAUDE.md`). Never rewrite history — only append or, at pruning time, move old entries out wholesale.

> **The Phase 0–7 build history and the Phase 9 follow-ups + Phase 10 (RAG/research surface) build history are in [`/docs/session-log-archive.md`](./archive/session-log-archive.md)** (Rollup 1 = Phases 0–7, Rollup 2 = Phase 8 + Phase 9, Rollup 3 = Phase 9 follow-ups + Phase 10). Per-feature build detail: [`/docs/archive/`](./archive/).

## 2026-09-07 — Phase 11 scoped (multi-agent analytical briefings) → ADR 0021

- User supplied [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) (Apache-2.0, LangGraph/Python) as the reference and asked to integrate the pattern. Ran a 4-question scoping session.
- **Answers:** pipeline = analyst team + bull/bear **debate** + synthesis (the full analytical half); runtime = "choose the best approach"; output = a debated briefing that may state a **direction**, with the not-investment-advice disclaimer; memory = **full reflection loop in v1**.
- **[ADR 0021](./decisions/0021-phase-11-multi-agent-analysis.md)** written (status: *proposed*). Core resolution: port steps 1–2 of TradingAgents (analysts → debate → synthesis) as **our own TS code, not a dependency**, and **stop before the trade decision** (no trader / risk-manager / position / simulated execution — the `GUARDRAIL` forbids buy/sell/hold, targets, "should you invest"). The synthesis may say which side of the debate is better-evidenced ("direction"), never a recommendation; guardrail line still appends verbatim; a post-check rejects trade-action phrasing.
- **Architecture:** `POST /api/agents/run` → an **async, checkpointed job** (`agentRuns` collection IS the checkpoint) → `/api/agents/tick` runs one phase per invocation and re-invokes (never hits `maxDuration`) → `GET /api/agents/run/[id]` polls → `/dashboard/agents` renders. Reflection: a daily cron compares the debate's key claims to the stock's later move, writes per-user lessons, injects them into future runs. Stock subject only.
- **Runtime recommendation (open item):** TS in the Next app — reuses `getUserAiConfig` / provider adapters / guardrail prompts / MCP tools / `retrieve` / `fundamentalsApi`; a Python/LangGraph service would duplicate all of that + a third Vercel project. **Awaiting confirmation before build.**
- ROADMAP Phase 11 rewritten (🔄 scoped) with a 3-part checklist (pipeline / async runs / reflection). **Not started.**

## 2026-09-07 — Phase 11 built (Parts A–C) on `phase-11-agents`

- All of ADR 0021 built. `src/lib/agents/`:
  - **A — pipeline:** `indicators.ts` (SMA/EMA/RSI/drawdown/MA-cross), `prompts.ts` (4 analyst roles + bull/bear/synthesis/claims/reflect, each `withGuardrail`), `tradeActionCheck.ts` (regex guard), `context.ts` (`gatherAnalystContext` — 4 slices from the existing clients), `orchestrator.ts` (`runAnalysts` parallel / `runDebateRound` bull→bear / `runSynthesis` + one regenerate on a check hit / `extractKeyClaims`).
  - **B — async runs:** `store.ts` (`agentRuns` collection = the checkpoint; `claimNextRun` atomic + advisory lock), `runner.ts` (`advanceRun` — one phase per call), `POST /api/agents/run` (`after()` kicks the tick), `POST /api/agents/tick` (self-chaining), `GET /api/agents/run/[id]` (poll), `/dashboard/agents` (phase indicator + `MarkdownLite`), `agents-tick.yml` (5-min sweep).
  - **C — reflection:** `reflect.ts` (`reflectOnRun` — price move since the run → owner's model → hindsight lessons), `lessons.ts` (`buildLessonsContext` — same-symbol-then-sector, injected into debate + synthesis via `doc.lessonsContext`), `POST /api/cron/agents-reflect` + `agents-reflect.yml` (daily), `store` prune > 120 d.
- **Hard boundary held:** no trader / risk-manager / position / simulated execution. Synthesis may say which side the evidence leans; `scanForTradeActions` catches drift; guardrail line on every briefing. Cost + latency are the user's (BYO key, no operator-key path).
- **325 web tests / tsc / lint / `next build` green.** `CRON_SECRET` already a repo secret → both new workflows fire from `main`. `docs/architecture.md` + `docs/api-surface.md` + `public/openapi.json` updated.
- **Branch `phase-11-agents` (4 commits), not merged / not deployed — awaiting review.** No real end-to-end run yet (needs a live BYO key + a few minutes).

## 2026-09-12 — Mobile app dropped from roadmap; Phase 11 verified with a real end-to-end run

- User decided to drop mobile app development entirely. `ROADMAP.md`'s "Phase 12 — Mobile App" section removed (no `marketmitra-mobile-app-prompt.md` exists in the repo — never committed); the "Standing rules" stack line's `apps/web`/`apps/mobile`/`packages/shared` monorepo mention dropped. `CLAUDE.md` Active focus line updated to say mobile is dropped, not deprioritized. Web responsive/mobile-layout work (`MobileTabBar`, responsive passes) is unaffected — that's UI responsiveness, not a native app.
- Re-verified the full suite: 325 tests / `tsc --noEmit` / lint / `next build` all green, matching Phase 11's last state.
- **First real end-to-end run of the Phase 11 agent pipeline**, driven live via Chrome from `/dashboard/agents` against `TCS`, self-host mode with the local Gemini key: analyst panel → bull-vs-bear debate (2/2) → synthesis, all ticks completed with no errors, rendered a full briefing (bull case / bear case / where they agree / key uncertainties / what would change the picture / where the evidence currently leans) correctly stopping short of a buy/sell/hold call, guardrail line present. Confirms the ADR 0021 pipeline works live, not just in tests.
- **One environment gap found, not a code bug:** local `FUNDAMENTALS_API_URL=http://localhost:8420` has no local fundamentals-api instance running (needs local Postgres) → `getCompany()` returned null → `POST /api/agents/run` 502'd on the first attempt. Worked around for this test only by pointing at the hosted fundamentals-api (`https://marketmitra-fundamentals-api.vercel.app`, confirmed healthy) and restarting `next dev`; `.env.local` reverted back to `localhost:8420` afterward. If local full-stack testing is wanted again, either run `services/fundamentals-api` against a local Postgres or keep pointing at the hosted instance.

## 2026-09-12 — Phase 11 merged to main; archiving pass; repo made contributor-ready

- User signed off Phase 11 for the archiving protocol (tested green, verified with a real live run) and asked to merge, archive, remove the stray `deployed.png` screenshot, rewrite the README professionally, and set up GitHub for outside contributors — explicitly approved pushing all of it to GitHub.
- `phase-11-agents` fast-forwarded into `main` (`v2` kept identical). **Not yet deployed to production** — merge and deploy are separate; this session only did the former.
- **Found and fixed a regression during the merge:** an untracked `src/lib/dashboard/aiWidgetContent.ts` had reappeared — the exact file deliberately deleted in `18ae3e6` ("drop the fabricated Proactive insight chat tiles") for being fabricated placeholder content, unreferenced anywhere in `src/`. Almost certainly the IDE file-sync tool's recurring stray-file issue (see the Phase 9 follow-ups rollup). Removed again.
- **Context-maintenance protocol run for Phase 11:** new archive
  [`/docs/archive/multi-agent-analysis.md`](./archive/multi-agent-analysis.md) (full build detail
  + the live-run verification + the local-fundamentals-api environment note); `architecture.md`
  status header + phase list + shipped-features updated (also caught up the stale Phase 10b/11
  status text left over from before); `ROADMAP.md` Phase 11 → ✅ merged, not yet deployed;
  `CLAUDE.md` Current phase / Active focus rewritten — no phase in flight, work shifts to
  page-by-page and feature-by-feature refinement, discussed and scoped one at a time.
- `session-log.md` was at 20 entries — over the rollup threshold. Rolled the Phase 9
  follow-ups + all of Phase 10 (RAG + research surface) into `session-log-archive.md` as
  **Rollup 3**; live log now keeps only the Phase 11 arc.
- Repo cleanup + contributor setup done in the same pass: `deployed.png` removed (dead
  screenshot, not referenced anywhere); README rewritten for a professional open-source
  presentation; `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, GitHub issue/PR
  templates, and a CI workflow (lint/typecheck/test/build on push + PR) added. All pushed to
  `main`/`v2` on GitHub with the user's explicit go-ahead.
- **Next:** no build in flight — page/feature refinement, to be scoped in discussion as it comes up. Deploying Phase 11 to production remains open whenever the user wants it live.
