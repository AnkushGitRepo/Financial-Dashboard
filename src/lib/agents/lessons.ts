// Phase 11 Part C — inject lessons from the user's past reflected runs
// into a fresh one (ADR 0021). Same-symbol lessons first, then same-sector.
// Framed as calibration of the panel's reasoning, never a prediction.

import { reflectedRunsForContext } from './store';

const MAX_RUNS = 3;

export async function buildLessonsContext(
  userId: string,
  symbol: string,
  sector: string | null
): Promise<string | null> {
  const runs = await reflectedRunsForContext(userId, symbol, sector, MAX_RUNS);
  const blocks = runs
    .map((r) => r.reflection)
    .filter((x): x is NonNullable<typeof x> => !!x && !!x.lessons?.trim())
    .map((r) => {
      const when = r.writtenAt.slice(0, 10);
      const move =
        r.movePct != null ? ` (the stock moved ${r.movePct >= 0 ? '+' : ''}${r.movePct.toFixed(1)}% over ~${r.horizonDays}d)` : '';
      return `- [reviewed ${when}${move}] ${r.lessons.trim()}`;
    });
  if (blocks.length === 0) return null;
  return [
    'Lessons from this account’s earlier panels on this stock/sector — calibration of the reasoning only, NOT predictions, and the review windows are short and arbitrary:',
    ...blocks,
  ].join('\n');
}
