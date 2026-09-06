import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RetrievedChunk } from './retrieve';

const retrieve = vi.fn<() => Promise<RetrievedChunk[] | null>>();
vi.mock('./retrieve', () => ({ retrieve: () => retrieve() }));

const { retrieveInsightGrounding } = await import('./insightContext');

const chunk = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  text: '  Reliance raised its capex guidance for FY27.  ',
  score: 0.71,
  source: 'https://x/a',
  sourceUrl: 'https://x/a',
  title: 'Reliance lifts capex',
  docType: 'news',
  symbol: 'RELIANCE',
  publishedAt: new Date('2026-09-02T00:00:00Z'),
  ...over,
});

beforeEach(() => retrieve.mockReset());

describe('retrieveInsightGrounding', () => {
  it('returns an empty grounding when retrieval is unavailable', async () => {
    retrieve.mockResolvedValue(null);
    expect(await retrieveInsightGrounding({ query: 'q', userId: 'u1' })).toEqual({
      passages: [],
      text: '',
    });
  });

  it('returns an empty grounding when nothing matched', async () => {
    retrieve.mockResolvedValue([]);
    expect(await retrieveInsightGrounding({ query: 'q', userId: null })).toEqual({
      passages: [],
      text: '',
    });
  });

  it('trims passage text and labels each with source + date', async () => {
    retrieve.mockResolvedValue([chunk()]);
    const g = await retrieveInsightGrounding({ query: 'q', userId: 'u1' });
    expect(g.passages).toEqual([
      { source: 'Reliance lifts capex, 2026-09-02', text: 'Reliance raised its capex guidance for FY27.' },
    ]);
    expect(g.text).toContain('Retrieved context');
    expect(g.text).toContain('- (Reliance lifts capex, 2026-09-02) Reliance raised its capex');
  });

  it('honours a custom heading', async () => {
    retrieve.mockResolvedValue([chunk({ title: null, publishedAt: null })]);
    const g = await retrieveInsightGrounding({ query: 'q', userId: null, heading: 'DRHP passages' });
    expect(g.text.startsWith('DRHP passages:\n')).toBe(true);
    expect(g.passages[0].source).toBe('https://x/a');
  });
});
