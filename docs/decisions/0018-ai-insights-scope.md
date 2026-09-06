# 0018: AI Insights — Phase 8 scope, provider model, key handling, caching

Date: 2026-09-06
Status: accepted (scoping decision)

## Context

Phase 8 in `ROADMAP.md` was ❓ ("which LLM provider(s), insight
scope/format, trial-limit counting"). The trial-limit part is moot —
[ADR 0011](./0011-three-tier-fundamentals-data-sourcing.md) /
[ADR 0016](./0016-landing-page-no-paid-tier-reconciliation.md) killed the
paid tier. This ADR is the scoping-session output.

Existing state: **no AI/LLM code anywhere** (`aiWidgetContent.ts` is
scripted demo text), **no user-settings surface**, no key storage.
[ADR 0016](./0016-landing-page-no-paid-tier-reconciliation.md): AI
insights are **bring-your-own-key in every deployment mode**.

Scoping answers (user): **all four surfaces** (stock / portfolio / IPO /
the "Mitra" widget); provider is **user picks one of Gemini / Anthropic /
OpenRouter and supplies that key**; hosted users enter it on a **settings
page, stored encrypted**; **IPO insights may be cross-user shared, stock &
portfolio must not.**

## Decisions

### 1. Provider — AI SDK v6, three BYO adapters, no gateway

Use Vercel's **AI SDK v6** (`ai`) with the provider adapters directly —
**not** the AI Gateway (Gateway is a shared-key/billing product; this is
per-user BYO). A small factory maps the user's stored
`{ provider, apiKey, model? }` to a `LanguageModel`:

| provider | adapter | default model |
| --- | --- | --- |
| `gemini` | `@ai-sdk/google` | `gemini-2.5-flash` (cheap, generous free tier) |
| `anthropic` | `@ai-sdk/anthropic` | `claude-haiku-4-5` |
| `openrouter` | `@openrouter/ai-sdk-provider` | a small default, user-overridable |

`src/lib/ai/` — `providers.ts` (the factory), `generate.ts` (`generateText`
/ `generateObject` wrappers), `prompts.ts` (system prompts).

**Guardrails, in every system prompt:** neutral factual synthesis of the
supplied public data only; **no buy/sell/hold recommendation, no price
target, no "should you invest"**; every insight ends with "This is a
synthesis of public data, not investment advice." (project ethos + the
assistant's own constraints).

### 2. Key handling — encrypted settings, env fallback

New MongoDB `userSettings` collection: `{ userId, aiProvider, aiKeyEnc,
aiModel?, updatedAt }`. `aiKeyEnc` is AES-256-GCM (Node `crypto`)
encrypted with a server secret **`SETTINGS_ENC_KEY`** (32-byte, base64;
required for the settings feature; documented for self-host). Decryption
is server-side only, per request — the plaintext key never reaches the
browser after entry and is never logged.

`src/lib/ai/userAiConfig.ts` → `getAiConfig(userId)`:
1. the user's stored setting (decrypted), else
2. deployment env `AI_PROVIDER` + `AI_API_KEY` (+ `AI_MODEL`) — the
   self-host / operator path, else
3. `null` → the UI shows "Add your AI key" pointing at settings.

New **`/dashboard/settings`** page (server + client): provider dropdown,
API-key input (password field), optional model. "Test & save" does one
cheap live call ("reply OK") to validate before storing. Reachable from a
link in the `AppHeader` user area and from every insight card's
empty/error state. `DELETE` clears it.

### 3. Surfaces & caching

New MongoDB `insights` collection: `{ scope, key, userId, inputHash,
content, model, generatedAt }` (+ TTL index / `staleAt`).

- **Stock** (`/dashboard/stock/[ticker]`) — synthesises ratios /
  financials / shareholding trend / recent news into a short read.
  **Per-user cache**, key `(userId, symbol)`, `inputHash` over the data
  snapshot, ~24h TTL. Requires the user's key. `POST /api/insights/stock`.
- **Portfolio** (`/dashboard/portfolio`) — concentration, sector tilt,
  what's driving P&L, diversification notes. **Per-user cache**, key
  `(userId, 'portfolio')`, `inputHash` over the enriched holdings, ~6h
  TTL. Requires the user's key. `POST /api/insights/portfolio`.
- **IPO** (`/dashboard/ipos` expanded row) — a brief from the structured
  IPO data (+ DRHP text when available, see §4). **Cross-user shared
  cache**, `userId = null`, key `slug`, `inputHash` over the IPO row.
  May be generated with the deployment's `AI_API_KEY` (see §5); falls
  back to the requesting user's key. `POST /api/insights/ipo`.
- **"Mitra" widget** — `aiWidgetContent.ts`'s scripted `AI_REPLIES`
  replaced by a real `POST /api/ai/chat` (streamed via the AI SDK) that
  assembles context from the user's portfolio summary + holdings + recent
  news and answers grounded in it. **On-demand, no cache.** Requires the
  user's key. Same guardrails; it declines advice-seeking questions with
  a neutral "I can summarise the data, not tell you what to buy."

Every insight card: a "Generate" button when uncached, the cached content
+ "generated Xh ago · Refresh" when cached, an "Add your AI key" link when
`getAiConfig` is null.

### 4. DRHP grounding for IPO insight — best-effort, trimmable

The IPO scraper (`tier3_ipo_scraper`) gains a step: from the IPO detail
page (`investorgain.com/gmp/{slug}/{id}/`) extract the **DRHP/RHP PDF
link** → new `ipos.drhp_url` column. A new fundamentals-api endpoint
`GET /ipos/{slug}/drhp-extract` fetches that PDF and returns key sections
(business overview, objects of the issue, risk factors, summary
financials) via the existing `pdfplumber`, capped to ~15k tokens. The IPO
insight prompt uses this text when present.

**If DRHP discovery/extraction proves flaky, the IPO insight still works
from the structured data alone** — DRHP grounding is additive, not a
blocker for the phase.

### 5. Who pays — amends ADR 0016

[ADR 0016](./0016-landing-page-no-paid-tier-reconciliation.md) said "AI
insights are BYO-key in every mode". Refined:

- **Per-user insights (stock, portfolio, Mitra chat)** — always the
  user's own key. No shared-key path.
- **Shared reference insights (IPO briefs)** — may be generated with the
  deployment's `AI_API_KEY` when the operator sets one (bounded: ~1 call
  per IPO, cached for everyone), same carve-out as VADER news sentiment
  (ADR 0015) and Screener `about` text. When no env key, the first user
  who opens that IPO's insight generates it with their key, and everyone
  after reads the cache.

The landing-page copy from ADR 0016 ("bring your own AI key for insights")
stays accurate for what the user experiences.

### 6. Explicitly out of Phase 8 v1

- Multi-agent / debate-style analysis — that's Phase 11 (TradingAgents
  pattern), explicitly separate.
- Streaming for the card insights (chat streams; cards return whole).
- Per-insight cost metering / usage dashboards.
- RAG over a vector store — that's Phase 10.
- Fine-tuning, tool-calling agents, web search in insights.
- Non-English output.

## Consequences

- First LLM integration in the repo: `ai` + `@ai-sdk/google` +
  `@ai-sdk/anthropic` + `@openrouter/ai-sdk-provider` added to the web
  app; `SETTINGS_ENC_KEY` and the optional `AI_PROVIDER`/`AI_API_KEY`/
  `AI_MODEL` env vars. `crypto` (Node built-in) for key encryption.
- First user-settings surface (`userSettings` collection + `/dashboard/
  settings`) — reusable for any later BYO integration.
- `insights` collection with mixed per-user and shared rows; the `userId
  = null` shared rows are the only cross-user data the app generates, and
  they contain only synthesis of public IPO data.
- fundamentals-api gains `ipos.drhp_url` + `GET /ipos/{slug}/drhp-extract`
  (a migration + a route). PDF fetching is best-effort and degrades.
- Deployment-mode gate unaffected — AI is BYO-key, gated on
  `getAiConfig`, not `isHosted()`.
- Guardrail: nothing in Phase 8 emits a recommendation or a price target;
  every surface is framed and prompted as neutral synthesis.
