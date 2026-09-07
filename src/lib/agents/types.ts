// Shared shapes for the Phase 11 multi-agent pipeline (ADR 0021).

export type AnalystRole = 'fundamentals' | 'news_sentiment' | 'technical' | 'macro';

export const ANALYST_ROLES: readonly AnalystRole[] = [
  'fundamentals',
  'news_sentiment',
  'technical',
  'macro',
] as const;

export interface AnalystReport {
  role: AnalystRole;
  text: string;
  /** false when the analyst's data slice was empty (it still writes a
   *  short "nothing to work with" note so the debate knows). */
  hadData: boolean;
}

export interface DebateTurn {
  side: 'bull' | 'bear';
  round: number;
  text: string;
}

export interface KeyClaim {
  side: 'bull' | 'bear' | 'neutral';
  claim: string;
}

export interface Reflection {
  writtenAt: string;
  horizonDays: number;
  priceAtRun: number | null;
  priceAtReflection: number | null;
  movePct: number | null;
  lessons: string;
}

/** A `queued`/`running` run advances through these; `complete` ⇒ status `done`. */
export type RunPhase = 'analysts' | 'debate' | 'synthesis' | 'complete';
export type RunStatus = 'queued' | 'running' | 'done' | 'error';

export const DEBATE_ROUNDS = 2;
export const REFLECTION_HORIZON_DAYS = 21;
