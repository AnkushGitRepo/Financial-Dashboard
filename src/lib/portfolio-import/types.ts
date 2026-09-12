// Shared shapes for the Mitra file-based portfolio import pipeline
// (ADR 0022): Extract -> Match -> Preview -> Commit. `ProposedChange` is
// what `POST /api/portfolio-import/extract` returns and what the user
// (possibly edited) sends back to `POST /api/portfolio-import/confirm` —
// nothing is persisted server-side in between (see the ADR's statelessness
// note: this is what makes "never auto-save" a hard guarantee).

import type { SearchResultOut } from '@/lib/dashboard/fundamentalsApi';

export interface ExtractedHolding {
  /** Company name as it appeared in the source file, if any. */
  rawName: string | null;
  /** Ticker/symbol as it appeared in the source file, if any. */
  rawSymbol: string | null;
  quantity: number;
  avgPrice: number;
}

export type MatchStatus = 'matched' | 'ambiguous' | 'unmatched';

export interface HoldingSnapshot {
  quantity: number;
  avgPrice: number;
}

export interface ProposedChange {
  /** Stable per-response id (not a DB id) so the client can track edits
   * across the extract -> confirm round trip. */
  tempId: string;
  extracted: ExtractedHolding;
  matchStatus: MatchStatus;
  matchedSymbol: string | null;
  matchedName: string | null;
  /** Populated for `ambiguous` (a few close candidates to choose from);
   * empty for `matched` (already resolved) and `unmatched` (none found). */
  candidates: SearchResultOut[];
  action: 'create' | 'update';
  existingHoldingId: string | null;
  before: HoldingSnapshot | null;
  after: HoldingSnapshot;
}

/** What the client sends back on confirm — a `ProposedChange` the user
 * has reviewed, with `matchedSymbol` filled in if they resolved an
 * ambiguous/unmatched row via the search dropdown. Rows the user excluded
 * are simply not included in the array. */
export interface ConfirmedChange {
  matchedSymbol: string;
  action: 'create' | 'update';
  existingHoldingId: string | null;
  after: HoldingSnapshot;
}

export type ExtractError =
  | { error: 'unreadable'; message: string }
  | { error: 'no_holdings_found'; message: string };
