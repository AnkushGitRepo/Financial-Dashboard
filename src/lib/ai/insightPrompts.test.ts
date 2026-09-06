import { describe, expect, it } from 'vitest';
import { buildStockPrompt, buildPortfolioPrompt, buildIpoPrompt } from './insightPrompts';

const grounding = [
  { source: 'Reliance lifts capex, 2026-09-02', text: 'Capex guidance raised for FY27.' },
];

const stockInput = {
  symbol: 'RELIANCE',
  company: { name: 'Reliance Industries', sector: 'Energy', industry: 'Refining', about: null },
  ratios: [],
  latestClose: 2500,
  financialsSummary: [],
  shareholdingLatest: [],
  news: [],
};

describe('grounding block in prompt builders', () => {
  it('buildStockPrompt appends retrieved context when present', () => {
    const withG = buildStockPrompt({ ...stockInput, grounding });
    expect(withG).toContain('Retrieved context (indexed news / filings)');
    expect(withG).toContain('- (Reliance lifts capex, 2026-09-02) Capex guidance raised for FY27.');
  });

  it('buildStockPrompt omits the block when there is no grounding', () => {
    expect(buildStockPrompt(stockInput)).not.toContain('Retrieved context');
    expect(buildStockPrompt({ ...stockInput, grounding: [] })).not.toContain('Retrieved context');
  });

  it('buildPortfolioPrompt appends the notes-aware heading', () => {
    const out = buildPortfolioPrompt({
      holdings: [{ symbol: 'TCS', name: 'TCS', sector: 'IT', quantity: 1, avgPrice: 3000, ltp: 3200 }],
      grounding,
    });
    expect(out).toContain('Retrieved context (indexed news / your notes)');
  });

  it('buildIpoPrompt uses grounding as the DRHP stand-in when no drhpExtract', () => {
    const ipo = {
      name: 'Acme Ltd',
      category: 'mainboard' as const,
      status: 'open' as const,
      price: 100,
      ipo_size_cr: 500,
      lot_size: 100,
      subscription_times: 2,
      gmp: 10,
      gmp_pct: 10,
      open_date: null,
      close_date: null,
      listing_date: null,
      anchor: true,
    };
    const out = buildIpoPrompt({ ipo, drhpExtract: null, grounding });
    expect(out).toContain('Retrieved context (indexed DRHP / prospectus / news passages)');
    expect(out).not.toContain('No DRHP text available');
  });

  it('buildIpoPrompt still prefers a real drhpExtract over grounding', () => {
    const ipo = {
      name: 'Acme Ltd',
      category: 'sme' as const,
      status: 'upcoming' as const,
      price: null,
      ipo_size_cr: null,
      lot_size: null,
      subscription_times: null,
      gmp: null,
      gmp_pct: null,
      open_date: null,
      close_date: null,
      listing_date: null,
      anchor: null,
    };
    const out = buildIpoPrompt({ ipo, drhpExtract: 'Real DRHP text here.', grounding });
    expect(out).toContain('DRHP extract (key sections):\nReal DRHP text here.');
    expect(out).not.toContain('Retrieved context');
  });
});
