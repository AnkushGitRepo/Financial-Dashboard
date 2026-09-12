// Turns extracted + matched holdings into the create-vs-update diff the
// preview UI shows (ADR 0022, part C). Pure orchestration — the actual
// matching lives in `match.ts`; this just adds "does the user already
// hold this symbol" on top.

import { randomUUID } from 'node:crypto';
import { listHoldings } from '@/lib/holdings';
import { matchHolding } from './match';
import type { ExtractedHolding, ProposedChange } from './types';

export async function buildProposedChanges(
  userId: string,
  extracted: ExtractedHolding[]
): Promise<ProposedChange[]> {
  const [existing, matches] = await Promise.all([
    listHoldings(userId),
    Promise.all(extracted.map(matchHolding)),
  ]);
  const existingBySymbol = new Map(existing.map((h) => [h.symbol, h]));

  return extracted.map((item, i) => {
    const match = matches[i];
    const existingHolding = match.matchedSymbol ? existingBySymbol.get(match.matchedSymbol) : undefined;
    return {
      tempId: randomUUID(),
      extracted: item,
      matchStatus: match.matchStatus,
      matchedSymbol: match.matchedSymbol,
      matchedName: match.matchedName,
      candidates: match.candidates,
      action: existingHolding ? 'update' : 'create',
      existingHoldingId: existingHolding ? existingHolding.id : null,
      before: existingHolding ? { quantity: existingHolding.quantity, avgPrice: existingHolding.avgPrice } : null,
      after: { quantity: item.quantity, avgPrice: item.avgPrice },
    };
  });
}
