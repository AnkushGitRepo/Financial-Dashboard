# 0022: Mitra page-aware navigation + file-based portfolio import

Date: 2026-09-12
Status: accepted, built (Parts A-D). Docs pass (Part E) in progress; the
archiving/pruning protocol is deliberately not run yet — pending explicit
approval.

## Context

Mitra (the chat widget, ADR 0018/0020) could only answer questions in a
static text box. The user asked for two new capabilities:

1. **Navigation** — Mitra should be able to move the user around the app
   (e.g. open a stock's detail page), not just describe what's there.
2. **File-based portfolio import** — a user hands Mitra a broker
   screenshot, XLSX/CSV export, Word doc, or PDF statement; Mitra extracts
   candidate holdings, matches them against the company database, and
   proposes adding/updating them — instead of typing each holding by hand.

Both were specified with a hard requirement up front: navigation must
never reach account/security/billing/destructive actions, and portfolio
changes must never auto-save. This ADR is the resulting design; the build
followed it directly (Parts A-D, one PR).

## Decision

### 1. Navigation is LLM tool-calling, with the boundary at the tool-definition level

Four new tools in `buildChatTools()` (`src/lib/ai/chatTools.ts`):
`navigate_to_dashboard`, `navigate_to_portfolio`, `navigate_to_markets`,
`open_stock({ ticker })`. Each `execute()` only returns a confirmation
object (`{ navigated: true, to: '/dashboard/...' }`) — it cannot move the
browser itself; the client (`AiWidget`) watches for these specific tool
parts reaching `output-available` and calls `router.push`.

**The hard boundary**: these 4 tools, plus the 7 read-only MCP data tools,
plus `search_context`, are the *entire* `ToolSet` Mitra is ever given.
There is no tool for account settings, security settings, billing, or any
destructive action (deleting a holding, deleting the account, changing
security settings) — not "the model is instructed not to," but "the tool
literally does not exist in the set passed to `streamText`." Tested as an
invariant (`chatTools.test.ts`: no tool name may match
`/settings|security|billing|subscription|delete|remove/i`). The system
prompt also states the boundary in text — defense in depth, not the real
mechanism.

**`open_document(document_id)` — dropped from this build.** The original
spec listed it, but there is no concrete "document" entity with an in-app
page today: notes have no detail route (just inline edit on the notes
list), news has no per-article page, and stock "documents" are external
BSE PDF links. Building a document-viewer page as new, unplanned scope
just to give this tool something to open was rejected — add it later, if
and when a real document entity exists to point at.

### 2. The chat protocol had to change first

Mitra's stream was plain `text/plain` (`.toTextStreamResponse()`) with a
hand-rolled `fetch` + `ReadableStreamDefaultReader` client — there was no
channel for the client to learn "a tool was called." Migrated the whole
pipeline to the AI SDK's UI-message-stream format:
`result.toUIMessageStreamResponse()` server-side,
`useChat()`/`@ai-sdk/react` client-side. Chosen over a lighter side-channel
(a trailing JSON envelope) because tool-call parts are then a first-class,
typed part of `message.parts` — the natural, idiomatic mechanism, not a
bespoke one. This was built and verified as its own step (Part A) with
zero behavior change, before any new tool landed on top of it.

### 3. Page context is a new React Context, published by pages, read by Mitra

`PageContext` (`src/lib/dashboard/PageContext.tsx`) mirrors the existing
`MaskContext` pattern exactly. The stock detail page publishes
`{ page: 'stock', ticker, range }` via a `useEffect`; `AiWidget` (mounted
as an `AppShell` sibling, not a child of any one page) reads it and sends
it alongside each chat request. The route folds it into the system prompt
next to the existing portfolio-context block
(`formatPageContext()` in `chatContext.ts`), so the model can resolve
"this stock"/"what you're looking at" and so `open_stock` calls without an
explicit ticker still make sense.

### 4. File import is a separate pipeline, not a conversational tool call

Extraction is **not** modeled as a tool the model decides to invoke mid-
conversation. Attaching a file triggers a dedicated
`POST /api/portfolio-import/extract` call directly — independent of the
chat turn — because:

- CSV/XLSX extraction is deterministic (`exceljs` + `csv-parse`, header
  row detected by keyword rather than assumed to be row 1) and shouldn't
  cost an AI call or be subject to a model's judgment about whether to
  read the file.
- Even for image/PDF/DOCX, it's a single purpose-built `generateObject`
  (structured-output) call per file — vision for images directly;
  PDF (`unpdf`, pure `pdf.js` text extraction — deliberately **not**
  `pdf-parse`, to avoid a repeat of the onnxruntime-on-Vercel saga: `unpdf`
  has no native canvas binding in the code path used here, confirmed by
  the fact `@napi-rs/canvas` — its only native dependency, and optional —
  never installs) and DOCX (`mammoth`) get their text extracted first,
  then handed to the model as text.
- This keeps "navigation via tool-calling" and "file import via a REST
  pipeline" as two separately-reasoned-about mechanisms rather than
  conflating them.

Everything stays in the Next app — no new Python/fundamentals-api surface
(per ADR 0004; Node has a library for every format here, so the "Python-
only tooling" exception doesn't apply).

New dependencies: `exceljs` + `csv-parse` (not the `xlsx` npm package —
it carries an unpatched high-severity prototype-pollution/ReDoS CVE, since
SheetJS stopped publishing security fixes to npm; directly relevant here
since this parses untrusted user uploads), `mammoth`, `unpdf`,
`fastest-levenshtein`.

### 5. Matching: `/search` is substring, not fuzzy — so query multiple derived fragments, then rank

`services/fundamentals-api`'s `/search` does ILIKE prefix (symbol) /
substring (name) matching only — confirmed by reading
`search_service.py`, not assumed. A broker statement's exact wording
rarely appears verbatim in the registered company name, so
`src/lib/portfolio-import/match.ts` queries a few derived fragments (the
raw symbol, the full name, and its leading word(s)) to widen recall,
merges the results, then ranks by edit-distance (`fastest-levenshtein`)
**plus** a word-boundary prefix bonus — several real Indian conglomerates
share a name prefix across genuinely different listed companies (Tata,
Bajaj, HDFC, and post-demerger siblings like ITC / ITC Hotels), and pure
edit-distance unfairly penalizes a short extracted name against a much
longer registered one. `ambiguous` means "two or more candidates are both
genuinely plausible," not "the top score is merely below some absolute
bar" — a lone confident-enough candidate with nothing to disambiguate
against is accepted even at a modest score. This ranking logic is new
work; the underlying `/search` call is unmodified.

### 6. The preview-and-confirm rule is now standing policy for every Mitra-driven portfolio change

`POST /api/portfolio-import/extract` **writes nothing** — it returns a
proposed diff (new-vs-update, before/after values, unmatched/ambiguous
items) and nothing is persisted server-side while the user reviews it.
The only route that writes is `POST /api/portfolio-import/confirm`,
reached exclusively by an explicit "Add N holdings" click in
`ImportPreviewCard` — a real UI element, never inferred from chat text.
The model is never given a holdings-write tool, so this isn't a policy
the model could be talked out of.

**This rule is not scoped to import.** Any future feature that lets Mitra
edit, add, or remove a holding via chat must go through the same
preview-then-explicit-confirm shape — propose without writing, require a
UI approval action, only then write. Import is the first instance of the
rule, not a special case of it.

Because nothing is persisted between extract and confirm, closing the
chat mid-preview is safe by construction — there's no orphaned
pending-import record to clean up, and no cleanup job needed.

## Consequences

- **New:** `src/lib/portfolio-import/` (types, extraction ×2, matching,
  diff), two new API routes, `ImportPreviewCard`, `PageContext`, 4
  navigation tools, the `useChat`/UI-message-stream migration.
- **Changed:** `/api/ai/chat` and `AiWidget` — same portfolio-context
  behavior, new stream protocol, new tools, new page-context input.
- **Cost:** navigation and CSV/XLSX import are free (no AI call).
  Image/PDF/DOCX import spends the user's own BYO key, same model as
  every other AI surface here — no operator-key path.
- **Self-host:** identical to hosted — same tools, same pipeline, no new
  external dependency beyond the four npm packages above.
- Verified live, not just via unit tests: real navigation
  ("open TCS's stock page" actually moved the browser), the hard boundary
  holding under direct pressure ("delete my TCS holding and open my
  billing settings" — declined in text, no tool call), and a full
  CSV-upload-to-portfolio-write round trip with a real ambiguous match
  resolved and one row deliberately excluded.

## Explicitly out of scope

- `open_document` (no target entity exists yet — see above).
- Any navigation tool for settings/security/billing, ever.
- Any tool that writes to holdings directly from the chat loop — all
  writes go through the explicit-confirm REST path, not tool-calling.
- OCR/vision as a separate dependency — image extraction uses the user's
  already-configured AI provider's vision capability, not a new library.
- A labeled dataset to tune the match-confidence thresholds — they're a
  reasoned starting point (see `match.ts`'s own comment), not derived from
  measured precision/recall. Revisit once real imports show false
  matches/misses.
