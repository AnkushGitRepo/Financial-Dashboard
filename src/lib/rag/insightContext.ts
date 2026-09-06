// Retrieval grounding for the cached insight surfaces (Phase 10 / ADR 0020).
//
// Each insight route calls `retrieveInsightGrounding(...)`, folds the
// returned `passages` into the object it hashes for the cache key (so a
// corpus re-index that changes what's retrieved invalidates the stale
// insight automatically — no separate version marker needed), and passes
// `text` to the prompt builder.
//
// Never throws: `retrieve()` already returns `null` when vector search is
// unavailable, and this returns an empty grounding in that case so the
// insight generates exactly as it did pre-Phase-10.

import { retrieve, type RetrieveOptions } from './retrieve';

export interface GroundingPassage {
  source: string;
  text: string;
}

export interface InsightGrounding {
  /** Compact, hashable list of the retrieved passages. */
  passages: GroundingPassage[];
  /** Ready-to-append prompt block, or '' when there's nothing. */
  text: string;
}

const EMPTY: InsightGrounding = { passages: [], text: '' };

export async function retrieveInsightGrounding(
  opts: RetrieveOptions & { heading?: string }
): Promise<InsightGrounding> {
  const hits = await retrieve(opts);
  if (!hits || hits.length === 0) return EMPTY;

  const passages = hits.map((h) => ({
    source: [h.title ?? h.source, h.publishedAt ? h.publishedAt.toISOString().slice(0, 10) : null]
      .filter(Boolean)
      .join(', '),
    text: h.text.trim(),
  }));

  const heading = opts.heading ?? 'Retrieved context (indexed news / filings / your notes)';
  const body = passages.map((p) => `- (${p.source}) ${p.text}`).join('\n');

  return { passages, text: `${heading}:\n${body}` };
}
