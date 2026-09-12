import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResultOut } from '@/lib/dashboard/fundamentalsApi';

const searchSymbols = vi.fn<(q: string) => Promise<SearchResultOut[]>>();
vi.mock('@/lib/dashboard/fundamentalsApi', () => ({ searchSymbols: (q: string) => searchSymbols(q) }));

const { matchHolding } = await import('./match');

beforeEach(() => {
  searchSymbols.mockReset();
});

describe('matchHolding', () => {
  it('is unmatched when there is nothing to query', async () => {
    const result = await matchHolding({ rawSymbol: null, rawName: null, quantity: 1, avgPrice: 1 });
    expect(result).toEqual({ matchStatus: 'unmatched', matchedSymbol: null, matchedName: null, candidates: [] });
    expect(searchSymbols).not.toHaveBeenCalled();
  });

  it('matches confidently on an exact symbol hit', async () => {
    searchSymbols.mockResolvedValue([
      { type: 'company', symbol: 'TCS', name: 'Tata Consultancy Services' },
    ]);
    const result = await matchHolding({ rawSymbol: 'TCS', rawName: null, quantity: 10, avgPrice: 3200 });
    expect(result).toEqual({
      matchStatus: 'matched',
      matchedSymbol: 'TCS',
      matchedName: 'Tata Consultancy Services',
      candidates: [],
    });
  });

  it('matches confidently on a near-exact name hit', async () => {
    searchSymbols.mockResolvedValue([
      { type: 'company', symbol: 'TCS', name: 'Tata Consultancy Services Limited' },
    ]);
    const result = await matchHolding({
      rawSymbol: null,
      rawName: 'Tata Consultancy Services Ltd',
      quantity: 10,
      avgPrice: 3200,
    });
    expect(result.matchStatus).toBe('matched');
    expect(result.matchedSymbol).toBe('TCS');
  });

  it('is ambiguous when two candidates are both plausible', async () => {
    searchSymbols.mockResolvedValue([
      { type: 'company', symbol: 'TATAMOTORS', name: 'Tata Motors' },
      { type: 'company', symbol: 'TATASTEEL', name: 'Tata Steel' },
    ]);
    const result = await matchHolding({ rawSymbol: null, rawName: 'Tata', quantity: 1, avgPrice: 1 });
    expect(result.matchStatus).toBe('ambiguous');
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.matchedSymbol).toBeNull();
  });

  it('is unmatched when nothing close comes back', async () => {
    searchSymbols.mockResolvedValue([{ type: 'company', symbol: 'INFY', name: 'Infosys' }]);
    const result = await matchHolding({
      rawSymbol: 'ZZZZZ',
      rawName: 'Completely Unrelated Corp',
      quantity: 1,
      avgPrice: 1,
    });
    expect(result.matchStatus).toBe('unmatched');
  });

  it('ignores index results from search — only companies can be a holding', async () => {
    searchSymbols.mockResolvedValue([{ type: 'index', symbol: 'NIFTY50', name: 'Nifty 50' }]);
    const result = await matchHolding({ rawSymbol: 'NIFTY50', rawName: null, quantity: 1, avgPrice: 1 });
    expect(result.matchStatus).toBe('unmatched');
  });
});
