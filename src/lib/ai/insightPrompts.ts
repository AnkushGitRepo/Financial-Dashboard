// Builders for the *user-content* half of each insight prompt (the system
// half lives in prompts.ts). Kept pure + separate so the exact input that
// gets hashed for caching is easy to see.

import type { CompanyOut, RatioOut } from '@/lib/dashboard/fundamentalsApi';
import type { NewsItem } from '@/lib/dashboard/newsApi';
import type { EnrichedHolding } from '@/lib/dashboard/enrichedHoldings';
import type { Ipo } from '@/lib/dashboard/iposApi';
import type { GroundingPassage } from '@/lib/rag/insightContext';

const money = (n: number | null | undefined) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);

/** Render retrieval grounding (Phase 10 / ADR 0020) as a prompt block, or
 *  '' when there is none. Kept here so the hashed input and the prompt
 *  text stay in lockstep. */
function groundingBlock(passages: GroundingPassage[] | undefined, heading: string): string {
  if (!passages || passages.length === 0) return '';
  return `\n${heading}:\n${passages.map((p) => `- (${p.source}) ${p.text}`).join('\n')}`;
}

export interface StockInsightInput {
  symbol: string;
  company: Pick<CompanyOut, 'name' | 'sector' | 'industry' | 'about'>;
  ratios: Pick<RatioOut, 'name' | 'value' | 'unit'>[];
  latestClose: number | null;
  financialsSummary: { label: string; latest: string | null; prior: string | null }[];
  shareholdingLatest: { category: string; percentage: string }[];
  news: Pick<NewsItem, 'title' | 'sentiment' | 'published_at'>[];
  grounding?: GroundingPassage[];
}

export function buildStockPrompt(i: StockInsightInput): string {
  const ratios = i.ratios.map((r) => `${r.name}: ${r.value ?? '—'}${r.unit ? ` ${r.unit}` : ''}`).join('; ');
  const fin = i.financialsSummary
    .map((f) => `${f.label}: ${f.latest ?? '—'} (prior ${f.prior ?? '—'})`)
    .join('; ');
  const sh = i.shareholdingLatest.map((s) => `${s.category} ${s.percentage}%`).join(', ');
  const news = i.news.length
    ? i.news.map((n) => `- [${n.sentiment}] ${n.title}`).join('\n')
    : '(no recent headlines)';

  return [
    `Company: ${i.company.name} (${i.symbol}), ${i.company.sector ?? 'sector n/a'} / ${i.company.industry ?? 'industry n/a'}.`,
    i.company.about ? `About: ${i.company.about}` : '',
    `Last close: ${money(i.latestClose)}.`,
    `Key ratios: ${ratios || '(none available)'}.`,
    `Recent financials: ${fin || '(none available)'}.`,
    `Latest shareholding: ${sh || '(none available)'}.`,
    `Recent news:\n${news}`,
    groundingBlock(i.grounding, 'Retrieved context (indexed news / filings)'),
  ]
    .filter(Boolean)
    .join('\n');
}

export interface PortfolioInsightInput {
  holdings: Pick<EnrichedHolding, 'symbol' | 'name' | 'sector' | 'quantity' | 'avgPrice' | 'ltp'>[];
  grounding?: GroundingPassage[];
}

export function buildPortfolioPrompt(i: PortfolioInsightInput): string {
  if (i.holdings.length === 0) return 'The portfolio is empty.';
  const rows = i.holdings.map((h) => {
    const value = h.ltp != null ? h.ltp * h.quantity : null;
    const cost = h.avgPrice * h.quantity;
    const pl = value != null ? value - cost : null;
    return `- ${h.name} (${h.symbol}), ${h.sector ?? 'sector n/a'}: qty ${h.quantity}, avg ${money(h.avgPrice)}, LTP ${money(h.ltp)}, value ${money(value)}, unrealised P&L ${money(pl)}`;
  });
  const totalValue = i.holdings.reduce((s, h) => s + (h.ltp != null ? h.ltp * h.quantity : 0), 0);
  const totalCost = i.holdings.reduce((s, h) => s + h.avgPrice * h.quantity, 0);
  return [
    `Holdings (${i.holdings.length}):`,
    ...rows,
    `Total current value ${money(Math.round(totalValue))}, total invested ${money(Math.round(totalCost))}.`,
    groundingBlock(i.grounding, 'Retrieved context (indexed news / your notes)'),
  ]
    .filter(Boolean)
    .join('\n');
}

export interface IpoInsightInput {
  ipo: Pick<
    Ipo,
    | 'name'
    | 'category'
    | 'status'
    | 'price'
    | 'ipo_size_cr'
    | 'lot_size'
    | 'subscription_times'
    | 'gmp'
    | 'gmp_pct'
    | 'open_date'
    | 'close_date'
    | 'listing_date'
    | 'anchor'
  >;
  drhpExtract?: string | null;
  grounding?: GroundingPassage[];
}

export function buildIpoPrompt(i: IpoInsightInput): string {
  const p = i.ipo;
  const lines = [
    `IPO: ${p.name} (${p.category === 'sme' ? 'SME' : 'Mainboard'}), status ${p.status}.`,
    `Price band cap: ${money(p.price)}. Issue size: ${p.ipo_size_cr != null ? `₹${p.ipo_size_cr} Cr` : '—'}. Lot: ${p.lot_size ?? '—'}.`,
    `Dates — open ${p.open_date ?? '—'}, close ${p.close_date ?? '—'}, listing ${p.listing_date ?? '—'}. Anchor investors: ${p.anchor == null ? '—' : p.anchor ? 'yes' : 'no'}.`,
    `Subscription so far: ${p.subscription_times != null ? `${p.subscription_times}x` : '—'}.`,
    `Grey-market premium (UNOFFICIAL third-party estimate, not from any exchange): ${p.gmp != null ? `₹${p.gmp}${p.gmp_pct != null ? ` (${p.gmp_pct}%)` : ''}` : '—'}.`,
  ];
  if (i.drhpExtract) {
    lines.push(`\nDRHP extract (key sections):\n${i.drhpExtract}`);
  } else if (i.grounding && i.grounding.length > 0) {
    lines.push(
      groundingBlock(i.grounding, 'Retrieved context (indexed DRHP / prospectus / news passages)')
    );
    lines.push(
      '\n(No full DRHP text — use the retrieved passages above plus the structured data, and say where detail is missing.)'
    );
  } else {
    lines.push(
      '\n(No DRHP text available — base the brief on the structured data above and general public knowledge of the company, and say so where detail is missing.)'
    );
  }
  return lines.join('\n');
}
