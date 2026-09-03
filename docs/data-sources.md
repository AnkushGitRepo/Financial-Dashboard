# Data Sources

Living registry of every external data source (API or scraper) the system depends on. This file describes the system **as it currently stands** — it is never pruned or archived, only updated. Update it the same session a data source is added, changed, or removed.

For each source, record: what it is, the endpoint(s) used, auth/key requirements, rate limits, cost, and — for scraping targets specifically — a ToS check before implementation.

## Policy

- Prefer public/free APIs first.
- Use paid APIs only where public ones don't cover the need.
- Scraping is last resort, only for data with no API alternative, and requires a ToS review flagged and resolved before implementation (not built first and checked later).

## Active sources

_None yet — no data-backed feature has shipped. Entries will be added per-feature during Phase 4, per the Feature-by-feature workflow in `/CLAUDE.md`._

<!--
Template for a new entry:

### <Source name>
- **Type:** public API | paid API | scraper
- **Used for:** <feature(s) that depend on this>
- **Endpoint(s):** <base URL / specific endpoints>
- **Auth:** <API key env var name, or none>
- **Rate limits:** <requests/min, daily quota, etc.>
- **Cost:** <free tier limits, paid tier cost>
- **ToS notes:** <only for scraping — link/summary of terms reviewed, date reviewed>
-->
