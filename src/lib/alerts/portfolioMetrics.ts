import type { Holding } from '@/lib/holdings';
import type { PortfolioMetrics } from './types';

/** Live quote fields this module needs, keyed by uppercase symbol. */
export type PriceLookup = Map<string, { price: number | null }>;

const ZERO: PortfolioMetrics = { totalValue: 0, unrealizedPnl: 0, unrealizedPnlPct: 0 };

function priceFor(symbol: string, prices: PriceLookup): number | null {
  return prices.get(symbol.toUpperCase())?.price ?? null;
}

/**
 * Whole-book figures from current quantities × live prices. Holdings with
 * no live quote are excluded from the totals (not treated as zero) — same
 * "don't fabricate a price" rule as everywhere else. Returns null if none
 * of the holdings could be priced, so a portfolio alert skips rather than
 * fires on a bogus 0.
 */
export function computePortfolioMetrics(
  holdings: Holding[],
  prices: PriceLookup
): PortfolioMetrics | null {
  let value = 0;
  let cost = 0;
  let priced = 0;

  for (const h of holdings) {
    const price = priceFor(h.symbol, prices);
    if (price === null) continue;
    priced += 1;
    value += price * h.quantity;
    cost += h.avgPrice * h.quantity;
  }

  if (priced === 0) return null;
  const pnl = value - cost;
  return {
    totalValue: value,
    unrealizedPnl: pnl,
    unrealizedPnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
  };
}

/** Single-holding figures, for a `portfolio_pnl` alert scoped to one symbol. */
export function computeHoldingMetrics(
  holding: Holding,
  prices: PriceLookup
): PortfolioMetrics | null {
  const price = priceFor(holding.symbol, prices);
  if (price === null) return null;
  const value = price * holding.quantity;
  const cost = holding.avgPrice * holding.quantity;
  const pnl = value - cost;
  return {
    totalValue: value,
    unrealizedPnl: pnl,
    unrealizedPnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
  };
}

export { ZERO as ZERO_METRICS };
