import { describe, expect, it } from 'vitest';
import type { Holding } from '@/lib/holdings';
import {
  computeHoldingMetrics,
  computePortfolioMetrics,
  type PriceLookup,
} from './portfolioMetrics';

const holding = (over: Partial<Holding>): Holding => ({
  id: 'h',
  userId: 'u',
  symbol: 'RELIANCE',
  quantity: 10,
  avgPrice: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const prices = (entries: Record<string, number | null>): PriceLookup =>
  new Map(Object.entries(entries).map(([s, price]) => [s.toUpperCase(), { price }]));

describe('computePortfolioMetrics', () => {
  it('sums value and cost across priced holdings', () => {
    const holds = [
      holding({ symbol: 'A', quantity: 10, avgPrice: 100 }),
      holding({ symbol: 'B', quantity: 5, avgPrice: 200 }),
    ];
    const m = computePortfolioMetrics(holds, prices({ A: 120, B: 210 }));
    // value = 1200 + 1050 = 2250 ; cost = 1000 + 1000 = 2000
    expect(m).toEqual({ totalValue: 2250, unrealizedPnl: 250, unrealizedPnlPct: 12.5 });
  });

  it('excludes unpriced holdings rather than treating them as zero', () => {
    const holds = [
      holding({ symbol: 'A', quantity: 10, avgPrice: 100 }),
      holding({ symbol: 'B', quantity: 5, avgPrice: 200 }),
    ];
    const m = computePortfolioMetrics(holds, prices({ A: 120, B: null }));
    // only A counts: value 1200, cost 1000
    expect(m).toEqual({ totalValue: 1200, unrealizedPnl: 200, unrealizedPnlPct: 20 });
  });

  it('returns null when nothing can be priced', () => {
    expect(computePortfolioMetrics([holding({ symbol: 'A' })], prices({ B: 100 }))).toBeNull();
    expect(computePortfolioMetrics([], prices({}))).toBeNull();
  });
});

describe('computeHoldingMetrics', () => {
  it('values a single position', () => {
    const m = computeHoldingMetrics(holding({ quantity: 10, avgPrice: 100 }), prices({ RELIANCE: 90 }));
    expect(m).toEqual({ totalValue: 900, unrealizedPnl: -100, unrealizedPnlPct: -10 });
  });

  it('returns null with no quote', () => {
    expect(computeHoldingMetrics(holding({}), prices({}))).toBeNull();
  });
});
