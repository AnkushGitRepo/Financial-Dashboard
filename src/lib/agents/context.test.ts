import { beforeEach, describe, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({
  getCompany: vi.fn(),
  getRatios: vi.fn(),
  getFinancials: vi.fn(),
  getShareholding: vi.fn(),
  getPeers: vi.fn(),
  getPrices: vi.fn(),
  getIndices: vi.fn(),
  getNews: vi.fn(),
  retrieveInsightGrounding: vi.fn(),
}));

vi.mock('@/lib/dashboard/fundamentalsApi', () => ({
  getCompany: f.getCompany,
  getRatios: f.getRatios,
  getFinancials: f.getFinancials,
  getShareholding: f.getShareholding,
  getPeers: f.getPeers,
  getPrices: f.getPrices,
  getIndices: f.getIndices,
}));
vi.mock('@/lib/dashboard/newsApi', () => ({ getNews: f.getNews }));
vi.mock('@/lib/rag/insightContext', () => ({ retrieveInsightGrounding: f.retrieveInsightGrounding }));

const { gatherAnalystContext } = await import('./context');

beforeEach(() => {
  vi.clearAllMocks();
  f.getCompany.mockResolvedValue({ name: 'Reliance', sector: 'Energy', industry: 'Refining', about: 'x' });
  f.getRatios.mockResolvedValue([{ name: 'P/E', value: '24', unit: '' }]);
  f.getFinancials.mockResolvedValue([
    { label: 'Sales', period_end: '2026-03-31', value: '100' },
    { label: 'Sales', period_end: '2025-03-31', value: '90' },
  ]);
  f.getShareholding.mockResolvedValue([{ category: 'Promoters', percentage: '50', quarter_end: '2026-03-31' }]);
  f.getPeers.mockResolvedValue([{ name: 'ONGC', is_target: false, pe: '8', roce_pct: '15' }]);
  f.getPrices.mockResolvedValue(
    Array.from({ length: 260 }, (_, i) => ({ close: String(100 + i * 0.5) }))
  );
  f.getIndices.mockResolvedValue([{ name: 'NIFTY 50', value: '24000', change: '+50', change_pct: '0.2', spark: [] }]);
  f.getNews.mockResolvedValue({ items: [{ title: 'H', source: 'S', published_at: '2026-09-01', sentiment: 'neutral' }] });
  f.retrieveInsightGrounding.mockResolvedValue({ passages: [{ source: 'src', text: 'passage' }], text: 't' });
});

describe('gatherAnalystContext', () => {
  it('returns a slice for every analyst role', async () => {
    const ctx = await gatherAnalystContext('RELIANCE', 'u1');
    expect(Object.keys(ctx).sort()).toEqual(['fundamentals', 'macro', 'news_sentiment', 'technical']);
    for (const s of Object.values(ctx)) {
      expect(s.hadData).toBe(true);
      expect(typeof s.text).toBe('string');
    }
    expect(ctx.fundamentals.text).toContain('Reliance (RELIANCE)');
    expect(ctx.technical.text).toContain('RSI(14)');
  });

  it('marks the fundamentals slice no-data when the company does not resolve', async () => {
    f.getCompany.mockResolvedValue(null);
    const ctx = await gatherAnalystContext('NOPE', 'u1');
    expect(ctx.fundamentals.hadData).toBe(false);
    expect(ctx.fundamentals.text).toMatch(/No fundamentals/);
  });

  it('marks the technical slice no-data with too few price points', async () => {
    f.getPrices.mockResolvedValue([{ close: '100' }, { close: '101' }]);
    const ctx = await gatherAnalystContext('RELIANCE', 'u1');
    expect(ctx.technical.hadData).toBe(false);
  });

  it('news slice has data if there are headlines OR retrieved passages', async () => {
    f.getNews.mockResolvedValue({ items: [] });
    f.retrieveInsightGrounding.mockResolvedValue({ passages: [{ source: 's', text: 'p' }], text: '' });
    const ctx = await gatherAnalystContext('RELIANCE', 'u1');
    expect(ctx.news_sentiment.hadData).toBe(true);

    f.retrieveInsightGrounding.mockResolvedValue({ passages: [], text: '' });
    const ctx2 = await gatherAnalystContext('RELIANCE', 'u1');
    expect(ctx2.news_sentiment.hadData).toBe(false);
  });
});
