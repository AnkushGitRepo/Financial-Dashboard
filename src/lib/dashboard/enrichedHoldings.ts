import { listHoldings, type Holding } from '@/lib/holdings';
import { getQuote } from './quotes';

export interface EnrichedHolding extends Holding {
  name: string;
  sector: string | null;
  ltp: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
}

/** Merges MongoDB-stored holdings with live quotes from the fundamentals
 * service. `ltp`/`dayChange*` are null when a live quote couldn't be
 * fetched (service offline, unrecognized symbol) — UI must show that
 * honestly rather than fall back to a stale or fabricated price. */
export async function getEnrichedHoldings(userId: string): Promise<EnrichedHolding[]> {
  let holdings: Holding[];
  try {
    holdings = await listHoldings(userId);
  } catch {
    return [];
  }

  const quotes = await Promise.all(holdings.map((h) => getQuote(h.symbol)));

  return holdings.map((h, i) => {
    const quote = quotes[i];
    return {
      ...h,
      name: quote?.name ?? h.symbol,
      sector: quote?.sector ?? null,
      ltp: quote?.price ?? null,
      dayChange: quote?.change ?? null,
      dayChangePct: quote?.changePct ?? null,
    };
  });
}
