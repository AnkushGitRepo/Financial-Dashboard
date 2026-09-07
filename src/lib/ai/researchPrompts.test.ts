import { describe, expect, it } from 'vitest';
import { buildResearchPrompt, describeSubject } from './researchPrompts';

const grounding = [{ source: 'Reliance ups capex, 2026-09-02', text: 'Capex guidance raised for FY27.' }];

describe('describeSubject', () => {
  it('names a company subject', () => {
    expect(describeSubject({ type: 'company', symbol: 'RELIANCE', name: 'Reliance Industries' })).toContain(
      'Reliance Industries (RELIANCE)'
    );
  });
  it('quotes a theme', () => {
    expect(describeSubject({ type: 'theme', text: '  Indian IT outlook  ' })).toContain(
      '"Indian IT outlook"'
    );
  });
  it('labels a portfolio pass', () => {
    expect(describeSubject({ type: 'portfolio' })).toMatch(/whole portfolio/);
  });
  it('lists comparison members with names when given', () => {
    const line = describeSubject({
      type: 'comparison',
      symbols: ['TCS', 'INFY'],
      names: { TCS: 'Tata Consultancy', INFY: 'Infosys' },
    });
    expect(line).toContain('Tata Consultancy (TCS)');
    expect(line).toContain('Infosys (INFY)');
  });
});

describe('buildResearchPrompt', () => {
  it('renders subject line, each fact block, then the grounding', () => {
    const out = buildResearchPrompt({
      subject: { type: 'company', symbol: 'RELIANCE' },
      factBlocks: [
        { heading: 'Valuation ratios', body: 'P/E: 24; P/B: 2.1' },
        { heading: 'Recent financials', body: 'Sales: 250000 (prior 240000)' },
      ],
      grounding,
    });
    expect(out).toContain('Subject: research brief on RELIANCE (RELIANCE)');
    expect(out).toContain('### Valuation ratios\nP/E: 24; P/B: 2.1');
    expect(out).toContain('### Recent financials');
    expect(out).toContain('- (Reliance ups capex, 2026-09-02) Capex guidance raised for FY27.');
    // fact blocks come before grounding
    expect(out.indexOf('Valuation ratios')).toBeLessThan(out.indexOf('Retrieved context'));
  });

  it('states plainly when there are no fact blocks', () => {
    const out = buildResearchPrompt({
      subject: { type: 'theme', text: 'PSU banks' },
      factBlocks: [],
      grounding,
    });
    expect(out).toContain('Structured facts: none were available');
  });

  it('states plainly when there is no retrieved context', () => {
    const out = buildResearchPrompt({
      subject: { type: 'portfolio' },
      factBlocks: [{ heading: 'Holdings', body: '- TCS x10' }],
      grounding: [],
    });
    expect(out).toContain('Retrieved context: none available');
    expect(out).not.toContain('indexed news / filings');
  });
});
