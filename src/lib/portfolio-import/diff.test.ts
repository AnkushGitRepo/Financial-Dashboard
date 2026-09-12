import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Holding } from '@/lib/holdings';
import type { MatchResult } from './match';
import type { ExtractedHolding } from './types';

const listHoldings = vi.fn<(userId: string) => Promise<Holding[]>>();
vi.mock('@/lib/holdings', () => ({ listHoldings: (userId: string) => listHoldings(userId) }));

const matchHolding = vi.fn<(extracted: ExtractedHolding) => Promise<MatchResult>>();
vi.mock('./match', () => ({ matchHolding: (e: ExtractedHolding) => matchHolding(e) }));

const { buildProposedChanges } = await import('./diff');

const holding = (over: Partial<Holding> = {}): Holding => ({
  id: 'h1',
  userId: 'u1',
  symbol: 'TCS',
  quantity: 5,
  avgPrice: 3000,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

const extracted = (over: Partial<ExtractedHolding> = {}): ExtractedHolding => ({
  rawSymbol: 'TCS',
  rawName: null,
  quantity: 10,
  avgPrice: 3200,
  ...over,
});

beforeEach(() => {
  listHoldings.mockReset();
  matchHolding.mockReset();
});

describe('buildProposedChanges', () => {
  it('proposes a create when the matched symbol is not already held', async () => {
    listHoldings.mockResolvedValue([]);
    matchHolding.mockResolvedValue({
      matchStatus: 'matched',
      matchedSymbol: 'TCS',
      matchedName: 'Tata Consultancy Services',
      candidates: [],
    });

    const [change] = await buildProposedChanges('u1', [extracted()]);
    expect(change.action).toBe('create');
    expect(change.existingHoldingId).toBeNull();
    expect(change.before).toBeNull();
    expect(change.after).toEqual({ quantity: 10, avgPrice: 3200 });
  });

  it('proposes an update with a before/after when the symbol is already held', async () => {
    listHoldings.mockResolvedValue([holding({ id: 'existing-1', symbol: 'TCS', quantity: 5, avgPrice: 3000 })]);
    matchHolding.mockResolvedValue({
      matchStatus: 'matched',
      matchedSymbol: 'TCS',
      matchedName: 'Tata Consultancy Services',
      candidates: [],
    });

    const [change] = await buildProposedChanges('u1', [extracted()]);
    expect(change.action).toBe('update');
    expect(change.existingHoldingId).toBe('existing-1');
    expect(change.before).toEqual({ quantity: 5, avgPrice: 3000 });
    expect(change.after).toEqual({ quantity: 10, avgPrice: 3200 });
  });

  it('carries an ambiguous match through with its candidates, defaulting to create', async () => {
    listHoldings.mockResolvedValue([]);
    matchHolding.mockResolvedValue({
      matchStatus: 'ambiguous',
      matchedSymbol: null,
      matchedName: null,
      candidates: [{ type: 'company', symbol: 'TATAMOTORS', name: 'Tata Motors' }],
    });

    const [change] = await buildProposedChanges('u1', [extracted({ rawSymbol: null, rawName: 'Tata' })]);
    expect(change.matchStatus).toBe('ambiguous');
    expect(change.candidates).toHaveLength(1);
    expect(change.action).toBe('create');
    expect(change.existingHoldingId).toBeNull();
  });

  it('only matches an existing holding scoped to the current user\'s list', async () => {
    listHoldings.mockResolvedValue([holding({ id: 'other-user-holding', symbol: 'INFY' })]);
    matchHolding.mockResolvedValue({
      matchStatus: 'matched',
      matchedSymbol: 'TCS',
      matchedName: 'Tata Consultancy Services',
      candidates: [],
    });

    const [change] = await buildProposedChanges('u1', [extracted()]);
    expect(change.action).toBe('create');
  });
});
