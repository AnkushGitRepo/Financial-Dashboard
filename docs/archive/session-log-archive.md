# Session Log Archive

Compressed history of old `/docs/session-log.md` entries, rolled up when the live log passes
~15-20 entries. Format: dates + one-line summaries. Oldest first. Full build detail for each
shipped feature lives in the per-feature files in this directory; decision rationale lives in
`/docs/decisions/` (never pruned).

---

## Rollup 1 — Phases 0–7 (2026-09-03 → 2026-09-06)

Rolled up 2026-09-06 when Phases 4–8 were signed off. Feature detail:
[fundamentals-data-service.md](./fundamentals-data-service.md),
[alerts-engine.md](./alerts-engine.md), [news-feed.md](./news-feed.md),
[ipo-tracker.md](./ipo-tracker.md), [landing-page.md](./landing-page.md),
[auth-pages.md](./auth-pages.md), [dashboard-shell.md](./dashboard-shell.md).

### Phase 0–3 — context, teardown, scaffold, landing/auth/shell

- **2026-09-03** — Teardown-and-rebuild kicked off; full Phase 0 context architecture built
  (`CLAUDE.md`, `/docs/`, ADRs 0001–0006).
- **2026-09-03** — v1 teardown complete: 141 files / 19,513 lines removed (`/client`,
  `/server`, `/api`, `/scraper`); `.git` + `README.md` kept.
- **2026-09-03** — Phase 2 scaffold live in production: Next.js 16 (TS, App Router, `src/`),
  MongoDB Atlas cached-connection helper, Clerk v7 wired, deployed to Vercel. ADR 0007
  (native `mongodb` driver over Mongoose); `middleware.ts` → `proxy.ts`; Clerk `<Show>`.
- **2026-09-03** — Landing page built from an approved Claude Design export (10 components in
  `src/components/landing/`), warm/cream palette, Framer Motion reveals with
  `prefers-reduced-motion`. ADR 0008 (hosted-vs-self-hosted distribution, landing-copy scope
  only). Declined a repeatedly-re-sent bogus `claude_design` MCP URL as likely injected.
- **2026-09-03 → 09-04** — Design-system doc written; on-brand auth pages replace default
  Clerk widgets. Three real Clerk-styling bugs found and fixed across three sessions:
  card composition/centering, asymmetric pill border-radius, and the root cause —
  Clerk's own `cardBox` was clipping the corners.
- **2026-09-04** — Dashboard shell built (Phase 3 complete): sidebar-nav empty-state layout
  (later superseded in Phase 4).
- **2026-09-04** — README rewritten for v2; MIT LICENSE added (ADR 0009).
- **2026-09-04** — Pushed to the `v2` branch on GitHub; first Phase 4 feature chosen
  (market indices/prices).
- **2026-09-04** — Context maintenance protocol run for the first time (landing / shell /
  auth detail → `/docs/archive/`).
- **2026-09-04** — Deployment-mode gate built (`NEXT_PUBLIC_DEPLOYMENT_MODE`, ADR 0010);
  `isHosted()` gates every Clerk/billing mount point. Re-verified in both modes.
- **2026-09-04** — Master `ROADMAP.md` added.

### Phase 4 — fundamentals data service + real-data dashboard

- **2026-09-05** — Vercel `DEPLOYMENT_MODE=hosted` confirmed; `services/fundamentals-api/`
  built — FastAPI + Postgres, three-tier free-data fallback (nsepython/bsedata → yfinance →
  Scrapling/Screener), 25 offline tests. EODHD (paid vendor) dropped (ADR 0011).
- **2026-09-05** — Dashboard / Portfolio / Markets / Stock UI built from an approved Claude
  Design import (fonts → Manrope / JetBrains Mono); replaced the Phase 3 sidebar shell.
- **2026-09-05** — UI wired to real data end-to-end; `mockData.ts` deleted; new Portfolio
  holdings feature (`holdings` collection + `/api/holdings` CRUD). ADR 0012. Diversification/
  target/drift metrics dropped rather than faked. Shareholding scraper fixed to capture full
  12-quarter history.
- **2026-09-05** — MongoDB Atlas reachable (user opened the IP allowlist); added a
  connection timeout (an unreachable cluster had hung page loads ~20–30 s). Real per-symbol
  company logos with a genuine initials fallback. Search upgraded to the full NSE universe
  (~2,570 equities via a new `/search` endpoint).
- **2026-09-05** — fundamentals-api hosted in production: Vercel Python function + Neon
  Postgres (ADR 0013). Next.js redeployed with `FUNDAMENTALS_API_URL` at it — real data live.
- **2026-09-05** — Peer comparison, About text, and real annual-report PDFs added to the
  stock page (all Tier 3 / Screener); `peer_comparisons` table + `companies.about` column.
  30/30 tests.

### Phase 5 — alerts engine

- **2026-09-06** — Phase 5 scoped (ADR 0014): four trigger types, in-app + email + webhook,
  Vercel Cron. No code.
- **2026-09-06** — Build: fundamentals-api `GET /quote` (batched live quote, 60 s TTL).
- **2026-09-06** — Build: `alerts` + `notifications` collections, generic notification
  subsystem, pure evaluators + `decideAlertTransition` (re-arm / cooldown / hysteresis).
- **2026-09-06** — Build: `/api/alerts` + `/api/notifications` + `/api/cron/evaluate-alerts`
  (`CRON_SECRET` guard, `isNseSession()` gate).
- **2026-09-06** — vitest set up (repo's first for the Next.js side); pure-logic unit tests.
- **2026-09-06** — Alerts UI + notification bell; feature usable end-to-end.
- **2026-09-06** — Loop + route tests, docs; build side feature-complete (78 tests).
- **2026-09-06** — Email deferred to a follow-up (only Resend available, needs a verifiable
  domain; ADR 0014 amendment). `sendEmail` stays a no-throw seam.
- **2026-09-06** — Phase 5 deployed to production (user granted deploy access); `vercel.json`
  daily cron (Hobby ceiling) + `CRON_SECRET` set.
- **2026-09-06** — `.github/workflows/evaluate-alerts.yml` added — inert until its secret +
  repo default branch are set.
- **2026-09-06** — Phase 5 committed + pushed (6 focused commits).

### Phase 6 — news feed

- **2026-09-06** — Phase 6 scoped (ADR 0015): hybrid free RSS (broad Indian-markets feeds +
  Google News per symbol), ingestion in fundamentals-api with lazy TTL refresh, VADER
  headline-tone tag, three surfaces, no notifications.
- **2026-09-06** — Backend built: migration `31f04c1b3507`, `app/ingestion/news.py` +
  `news_service.py`, `GET /news`, 14 offline tests (suite 50).
- **2026-09-06** — Frontend built: `newsApi.ts` + `/api/news` proxy, `/dashboard/news`
  (All-markets / My-holdings toggle), stock-page "Recent news" card, shared `NewsList`.
  Verified live against a local Postgres.
- **2026-09-06** — Phase 6 deployed to production: migration applied to prod Neon,
  fundamentals-api redeployed, prod `/news` + `/api/news` verified.
- **2026-09-06** — Landing page reconciled with "no paid tier" (ADR 0016): "Pricing" →
  "Two ways to run it" (both free), trial/price/AI-cap UI removed, FAQ rewritten; hosted
  fair-use rate limiting stated but not built (→ Phase 9).

### Phase 7 — IPO tracker + GMP

- **2026-09-06** — Phase 7 scoped (ADR 0017). ToS gate: Chittorgarh/InvestorGain reviewed —
  user accepts the trade-off on the same terms as the Screener scraper.
- **2026-09-06** — Backend: migration `2796fbd6805c`, `tier3_ipo_scraper/` pure parser
  (verified against a maintainer-saved page: 23 IPOs, all fields), `ipo_service.py`,
  `GET /ipos` + `POST /ipos/ingest`.
- **2026-09-06** — IPO alert variants (`ipo_watch` + `ipo`) + evaluator branch, reusing the
  Phase 5 engine.
- **2026-09-06** — IPO tracker UI: `/dashboard/ipos` (page + expandable rows + "Notify me"
  panel) + `IpoOpenCard` on the dashboard home.
- **2026-09-06** — User clarifications: retention → 10 days past listing; ingest is
  update-first (manual corrections not clobbered).
- **2026-09-06** — Out-of-band ingest job: `scripts/refresh_ipos.py` (Playwright Chromium →
  `_parse_ipo_rows` → `POST /ipos/ingest`) + `.github/workflows/refresh-ipos.yml` (~2 h,
  inert until secret + default branch set). 4 tests; suite 67.
- **2026-09-06** — Phase 7 deployed to production: prod Neon migrated, `IPO_INGEST_TOKEN`
  set, both projects redeployed, `refresh_ipos.py` run once → 39 real IPOs seeded.

---

## Rollup 2 — Phase 8 + Phase 9 (2026-09-06)

Rolled up 2026-09-06 when Phase 9 was signed off. Feature detail:
[ai-insights.md](./ai-insights.md), [api-surface.md](./api-surface.md).

### Phase 8 — AI insights + Mitra chat

- **2026-09-06** — Phase 8 scoped (ADR 0018): four surfaces, AI SDK v7 with three BYO
  adapters (not the shared-key Gateway), key AES-256-GCM encrypted in `userSettings`,
  IPO briefs cross-user-shared / stock+portfolio per-user, guardrail on every prompt.
- **2026-09-06** — pt.1: `src/lib/ai/` (providers / generate / prompts / userAiConfig),
  `crypto.ts`, `/dashboard/settings` + `/api/settings/ai`. 101 tests.
- **2026-09-06** — pt.2: `insights.ts` get-or-generate cache + `InsightCard` on stock /
  portfolio / IPO. 109 tests.
- **2026-09-06** — pt.5: Mitra chat real (streamed `/api/ai/chat`), `chatContext.ts`;
  `getUserAiConfig` self-host env-key fix; DRHP grounding deferred. 114 tests.
- **2026-09-06** — Phase 8 deployed (`SETTINGS_ENC_KEY` set).
- **2026-09-06** — Post-deploy fix: "key not working" was the retired `gemini-2.5-flash`
  model (Google 404s it for new keys) → default `gemini-3.6-flash`; `normalizeAiError`
  surfaces the provider's own text; `MAX_OUTPUT_TOKENS` 700→2048. `adc8301`, `ade642b`.
- **2026-09-06** — Prod verification pass for Phase 4–8 sign-off (interrupted by an IDE
  restart). Found the `getAiConfig` cold-start bug (see next).
- **2026-09-06** — `getAiConfig` cold-start bug fixed (`ffd3225`→`09fd986`→`ee8d443`): a
  blanket `.catch(() => null)` read a cold Mongo timeout as "no key" and SSR'd "Add your AI
  key". Landed on retry-with-backoff + `resolveHasAiKey()` degrading a persistent DB error
  to the optimistic "Generate" affordance. Prod-verified across HDFCBANK/LT/BAJFINANCE/MARUTI.

### Phases 4–8 sign-off + Phase 9

- **2026-09-06** — Phases 4–8 signed off; archiving/pruning protocol run (5 archive files,
  architecture.md collapsed, session-log Rollup 1, ROADMAP flipped ✅, CLAUDE.md rewritten).
- **2026-09-06** — `v2` merged to `main` (so GH Actions `schedule:` fires); the IDE
  file-sync tool's `" N"` duplicate files were swept into a commit then removed (`542d419`)
  and gitignore-guarded (`6e3c5c7`). Phase 9 scoped (ADR 0019): full MCP server, Upstash
  rate limiting, hosted API explorer.
- **2026-09-06** — Phase 9 Part 1: MCP server at `/api/mcp` — 7 read-only tools
  (`src/lib/mcp/`), `mcp-handler`@2, `public/llms.txt`. Route-in-Next-app, not a standalone
  service. 17 tests, suite 148. Deployed.
- **2026-09-06** — Phase 9 Parts 2+3: `src/lib/rateLimit.ts` + `src/proxy.ts` middleware +
  `withRateLimit` on `/api/mcp` and the AI routes; `services/fundamentals-api` got its own
  `app/rate_limit.py` + HTTP middleware (httpx-only, no `redis` dep). `public/openapi.json`
  + `/dashboard/api` explorer (CI-checked against the routes). 2 explorer bugs found + fixed
  in prod verification (MCP `Accept` header; SSE pretty-print). 158 tests.
- **2026-09-06** — Post-sign-off follow-ups: scripted "Proactive insight" chat tiles
  (`aiWidgetContent.ts`) deleted → real section-aware starter prompt chips; stock
  price-history chart x-axis fixed (dedup repeated month labels + reverse to chronological
  order — `/prices` returns newest-first).
- **2026-09-06** — README correctness sweep: "## Status" was frozen at Phase 3; removed the
  "paid hosted option (7-day free trial)" / "billing UI" language (contradicts the no-paid-tier
  constraint).
