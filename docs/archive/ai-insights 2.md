# Archive — AI Insights + Mitra Chat (Phase 8)

Signed off 2026-09-06. Live summary in [`/docs/architecture.md`](../architecture.md);
full rationale in [ADR 0018](../decisions/0018-ai-insights-scope.md).

## What shipped

Neutral AI synthesis on four surfaces — **stock read**, **portfolio insight**, **IPO brief**,
and the **Mitra chat** widget — all **BYO-key**. No MarketMitra-supplied model access.
Hard guardrail: synthesis only, no buy/sell/hold, no price targets, every insight ends
"This is a synthesis of public data, not investment advice."

## Providers & key storage

- **AI SDK v7** with three direct adapters — `@ai-sdk/google`, `@ai-sdk/anthropic`,
  `@openrouter/ai-sdk-provider`. **Not** the Vercel AI Gateway — that's a shared-key model,
  wrong for BYO. `src/lib/ai/providers.ts` `resolveModel({provider, apiKey, model})` +
  `DEFAULT_MODELS` / `PROVIDER_LABELS`.
- **Key at rest:** `/dashboard/settings` → `GET|PUT|DELETE /api/settings/ai` →
  `userSettings` Mongo collection, key **AES-256-GCM encrypted** (`src/lib/crypto.ts`,
  `iv.ct.tag` base64url, `SETTINGS_ENC_KEY`). Decrypted only server-side;
  `getAiSettingsView` returns a last-4 hint, never the key. PUT 503s without
  `SETTINGS_ENC_KEY`, 400 on a rejected key.
- **Resolution order** (`src/lib/ai/userAiConfig.ts` `getAiConfig(userId, {allowEnv})`):
  stored key ▸ `AI_PROVIDER` / `AI_API_KEY` env **only when `!isHosted()`** ▸ null.
  Hosted per-user surfaces never use an operator key; shared IPO briefs may
  (`getAiConfig(…, {allowEnv: true})`).
- `src/lib/ai/generate.ts` — `generateInsightText` + `validateAiKey`, both **never throw**;
  `normalizeAiError` buckets bad-key / quota / model-not-found errors.

## Insight cache

`src/lib/insights.ts` — `hashInput` (stable canonical-JSON sha256), `getCachedInsight`
(read-only, for SSR), `getOrGenerate({scope, key, userId, inputHash, ttlMs, generate,
force})` over the `insights` collection: reuse a row only while its input hash matches
**and** it's within TTL, else regenerate + upsert; **a generation error is never written.**
`POST /api/insights/stock` (per-user, 24 h) · `/portfolio` (per-user, 6 h, 400 when no
holdings) · `/ipo` (**cross-user shared**, `userId:null`, keyed by slug, 12 h).
`<InsightCard>` (`dashboard-charts/`) renders all three with SSR-passed initial content +
a `hasKey` gate. Pure prompt builders in `src/lib/ai/insightPrompts.ts`.

## Mitra chat

`POST /api/ai/chat` streams (`streamText` → `toTextStreamResponse()`, plain-text tokens on
the **Node runtime** — streaming does not require Edge). Context = `src/lib/ai/chatContext.ts`
`formatChatContext` (portfolio summary + per-holding P&L + `mergeNews`), `CHAT_SYSTEM`
guardrail ("use only the context", declines advice). `getUserAiConfig` — user key; env only
in self-host, never the hosted operator key. `AiWidget.tsx` was rewired: the old `AI_REPLIES`
script deleted, `send()` streams tokens into the last bubble, an "add your key → Settings"
hint shows when `GET /api/settings/ai` reports none.

The scripted section-keyed **"Proactive insight" tiles** (`aiWidgetContent.ts` `INSIGHTS`)
were kept — a separate concept demo, flagged as a Phase 9+ follow-up. (Noted in the Phase
4–8 prod verification: they show fictional numbers — "Meridian Finserv", "1,412 advancing" —
to a zero-holdings account, which reads as real analysis and clashes with the
no-fabricated-data rule. Follow-up item.)

## Post-deploy fixes (2026-09-06)

### 1. "Key not working" was a retired Gemini model

A valid AI Studio key failed "Test & save" with a misleading "could not find that model".
Two changes:
- **Diagnostics:** `normalizeAiError` now digs `responseBody` / `statusCode` / `cause` off
  the AI SDK error shape and appends the provider's own text (`"provider said: …"`);
  generation failures are `console.error`'d. That exposed the cause: **Google 404s
  `models/gemini-2.5-flash` for newly-created keys** ("no longer available to new users…
  use `models/gemini-3.6-flash`").
- **Root cause:** `DEFAULT_MODELS.gemini` `gemini-2.5-flash` → `gemini-3.6-flash`;
  `openrouter` `google/gemini-2.5-flash` → `google/gemini-3.6-flash`. Also: `validateAiKey`
  no longer requires non-empty text (a thinking model can spend a tiny budget entirely on
  hidden reasoning and still have authenticated); `MAX_OUTPUT_TOKENS` 700 → 2048 so real
  answers aren't truncated to empty. Commits `adc8301`, `ade642b`.

### 2. `getAiConfig` cold-start bug — the fix arc

**Symptom:** on the first (cold) serverless render of `/dashboard/stock/<X>` and
`/dashboard/ipos`, the insight cards showed *"Add your AI provider key"* despite a working
key. Warm renders were correct; a reload fixed it.

**Root cause:** `getAiConfig()` wrapped `getAiSettings(userId)` in a blanket
`.catch(() => null)`, collapsing "user genuinely has no key" (a real `null`) with "the Mongo
`findOne` + `decrypt` *threw* on a cold render" (the 5 s `serverSelectionTimeoutMS` /
connection-setup from the Phase 4 timeout guard). `getAiSettings` already returns `null`
cleanly for an absent doc, so a *thrown* error is always real.

**Three commits, each prod-deployed and re-checked live — the fix evolved under prod
cold-render testing:**

1. `ffd3225` — retry-once-then-bubble in a `loadStoredSettings` helper. Prod cold render of
   `/dashboard/stock/ITC` **hit the Next error boundary** ("This page couldn't load"): an
   immediate single retry still lost the race, and `getUserAiConfig` throwing during SSR now
   took the *whole page* down instead of mis-rendering one card. Net worse than the original
   bug for cold starts.
2. `09fd986` — 3 attempts at 0 / 150 / 400 ms backoff. Still crashed `/dashboard/stock/SBIN`
   on a fully-cold serverless instance — the driver's first connection isn't ready inside
   ~0.5 s.
3. `ee8d443` — **graceful degradation.** New `resolveHasAiKey(configPromise)` in
   `userAiConfig.ts`: `true` for a real config, `false` for a genuine no-key, and
   **`true` (optimistic) when the check throws** — the cold render shows the "Generate"
   affordance, never the misleading "Add your AI key" and never a 500. The real generate
   call runs client-side against a by-then-warm function, so a genuine "no key" still
   surfaces there. `getAiConfig` keeps the 3-attempt backoff (reduces how often the
   optimistic branch is hit). Wired into all three SSR surfaces —
   `stock/[ticker]/page.tsx`, `portfolio/page.tsx`, `ipos/page.tsx` (each derives
   `hasKey` / `aiKeyAvailable` via `resolveHasAiKey`, no client/component changes).

**Incidental:** a stale `.next/types/*" 2".ts` duplicate from the IDE's file-sync tool
tripped `tsc` once during this work — cleared by a fresh `next build`, unrelated to the
change.

**Prod-verified** on deploy `20j4l0hh9` (signed in, zero holdings): cold renders of
stock/{HDFCBANK, LT, BAJFINANCE, MARUTI} render fully with "Generate ai read"; `/dashboard/
ipos` open-IPO row expands to "Generate ipo brief"; `/dashboard/portfolio` empty state fine.
(A cold `MARUTI` first hit fundamentals-api's own `!company` graceful "couldn't load data"
path — its cold start, not the AI fix — cleared on reload.)

New `src/lib/ai/userAiConfig.test.ts` — 12 cases (stored key, genuine no-key → null,
retry-then-succeed, all-throw → bubble, `resolveHasAiKey` true/false/throws→true, env
fallback + `allowEnv:false` skip, no-user env path, hosted vs self-host). 131 tests green.

## Deferred (Phase 9+)

- **DRHP grounding for the IPO brief** — the wired GMP source (InvestorGain's "Live IPO GMP"
  report) carries **zero DRHP links** (confirmed by grep against the saved page). Populating
  `ipos.drhp_url` needs a second per-IPO SPA scrape or a SEBI filing-list scrape — a new
  fragile job, out of proportion to a "best-effort" feature. The IPO brief runs cleanly
  without it (`drhpExtract: null`). `GET /ipos/{slug}/drhp-extract` + `pdfplumber` come with
  it.
- Replacing the scripted "Proactive insight" tiles with real generated content.

## Explicitly out of Phase 8 (ADR 0018)

Multi-agent / debate-style analysis (Phase 11), streaming for the card insights (chat
streams; cards return whole), per-insight cost metering / usage dashboards, RAG over a
vector store (Phase 10), fine-tuning, tool-calling agents, web search in insights,
non-English output.
