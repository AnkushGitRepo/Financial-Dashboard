// Resolves an extracted holding's name/symbol against the fundamentals-api
// company database (ADR 0022, part C). `/search` itself only does an
// ILIKE prefix (symbol) / substring (name) match (see `search_service.py`)
// — a broker statement's exact wording rarely appears verbatim in the
// registered company name, so this queries a few derived fragments (the
// raw symbol, the full name, and its leading word(s)) to widen recall,
// merges the results, then ranks them by edit-distance similarity to
// decide confidence. The fuzzy *ranking* is new work here; the underlying
// `/search` call is the existing, unmodified endpoint.

import { distance } from 'fastest-levenshtein';
import { searchSymbols, type SearchResultOut } from '@/lib/dashboard/fundamentalsApi';
import type { ExtractedHolding, MatchStatus } from './types';

// Empirically-picked thresholds on a 0-1 normalized-edit-distance score —
// not derived from a labeled dataset, so treat as a starting point to
// revisit once real imports show false matches/misses.
//
// Ambiguity means "two+ candidates both plausible", not "the top score is
// merely below some absolute bar" — a lone confident-enough candidate with
// no serious competitor is a match, however unremarkable its raw score,
// since there's nothing left to disambiguate *against*.
const LOW_CONFIDENCE = 0.55;
// A top candidate must clear the next-best one by this margin to count as
// the clear pick — otherwise two close candidates both look plausible.
const CONFIDENT_MARGIN = 0.1;
const MAX_CANDIDATES = 3;

export interface MatchResult {
  matchStatus: MatchStatus;
  matchedSymbol: string | null;
  matchedName: string | null;
  candidates: SearchResultOut[];
}

function editDistanceSimilarity(a: string, b: string): number {
  const an = a.trim().toLowerCase();
  const bn = b.trim().toLowerCase();
  if (!an || !bn) return 0;
  const maxLen = Math.max(an.length, bn.length);
  return maxLen === 0 ? 1 : 1 - distance(an, bn) / maxLen;
}

// Normalized edit distance alone unfairly penalizes a short extracted name
// against a much longer registered one — "Tata" vs "Tata Motors Limited"
// scores low on pure distance despite being a clean word-boundary prefix.
// Several real Indian conglomerates (Tata, Bajaj, HDFC, Aditya Birla, ...)
// share a name prefix across genuinely different listed companies, so this
// case should surface as `ambiguous` (multiple prefix hits) rather than
// silently miss — the user picks the right one from the candidate list.
const PREFIX_BONUS = 0.75;
function wordBoundaryPrefixBonus(query: string, candidate: string): number {
  const q = query.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (!q) return 0;
  return c === q || c.startsWith(`${q} `) ? PREFIX_BONUS : 0;
}

function similarity(a: string, b: string): number {
  return Math.max(editDistanceSimilarity(a, b), wordBoundaryPrefixBonus(a, b));
}

/** Query fragments to try against the substring-matching `/search` — the
 * full raw text first, then progressively shorter leading-word prefixes,
 * since a long extracted name rarely appears verbatim in the registered
 * one but its first word or two usually does. */
function queryFragments(extracted: ExtractedHolding): string[] {
  const fragments = new Set<string>();
  if (extracted.rawSymbol) fragments.add(extracted.rawSymbol);
  if (extracted.rawName) {
    fragments.add(extracted.rawName);
    const words = extracted.rawName.trim().split(/\s+/);
    if (words.length > 1) fragments.add(words.slice(0, 2).join(' '));
    fragments.add(words[0]);
  }
  return [...fragments].filter((f) => f.length >= 2);
}

export async function matchHolding(extracted: ExtractedHolding): Promise<MatchResult> {
  const fragments = queryFragments(extracted);
  if (fragments.length === 0) {
    return { matchStatus: 'unmatched', matchedSymbol: null, matchedName: null, candidates: [] };
  }

  const results = await Promise.all(fragments.map((q) => searchSymbols(q)));
  const bySymbol = new Map<string, SearchResultOut>();
  for (const page of results) {
    for (const r of page) {
      if (r.type === 'company') bySymbol.set(r.symbol, r);
    }
  }
  const candidates = [...bySymbol.values()];
  if (candidates.length === 0) {
    return { matchStatus: 'unmatched', matchedSymbol: null, matchedName: null, candidates: [] };
  }

  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: Math.max(
        extracted.rawSymbol ? similarity(extracted.rawSymbol, candidate.symbol) : 0,
        extracted.rawName ? similarity(extracted.rawName, candidate.name) : 0
      ),
    }))
    .sort((a, b) => b.score - a.score);

  // Only candidates that clear the bar at all are real contenders — a weak
  // runner-up (e.g. a same-conglomerate sibling that merely shares a
  // search fragment) shouldn't force an otherwise-clear top pick into
  // `ambiguous`, and shouldn't be shown to the user as a plausible option.
  const contenders = scored.filter((s) => s.score >= LOW_CONFIDENCE);
  if (contenders.length === 0) {
    return { matchStatus: 'unmatched', matchedSymbol: null, matchedName: null, candidates: [] };
  }

  const [top, runnerUp] = contenders;
  if (contenders.length === 1 || top.score - runnerUp.score > CONFIDENT_MARGIN) {
    return {
      matchStatus: 'matched',
      matchedSymbol: top.candidate.symbol,
      matchedName: top.candidate.name,
      candidates: [],
    };
  }

  return {
    matchStatus: 'ambiguous',
    matchedSymbol: null,
    matchedName: null,
    candidates: contenders.slice(0, MAX_CANDIDATES).map((s) => s.candidate),
  };
}
