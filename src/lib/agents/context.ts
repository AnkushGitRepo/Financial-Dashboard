// Per-analyst data gathering for the Phase 11 pipeline (ADR 0021). Each
// analyst gets ONLY its slice, formatted as plain text. Reuses the
// existing data clients — no new sources. Pure formatting given the
// fetched data; the fetch orchestration is here too but every call is
// individually mockable.

import {
  getCompany,
  getFinancials,
  getIndices,
  getPeers,
  getPrices,
  getRatios,
  getShareholding,
} from '@/lib/dashboard/fundamentalsApi';
import { getNews } from '@/lib/dashboard/newsApi';
import { retrieveInsightGrounding } from '@/lib/rag/insightContext';
import { summariseTechnicals } from './indicators';
import type { AnalystRole } from './types';

export interface AnalystSlice {
  text: string;
  hadData: boolean;
}
export type AnalystContext = Record<AnalystRole, AnalystSlice>;

const money = (n: number | null | undefined) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);
const HEADLINE_LABELS = ['Sales', 'Revenue', 'Net Profit', 'Operating Profit', 'EPS'];

function financialsPivot(
  pl: { label: string; period_end: string; value: string | null }[] | null
): string {
  const byLabel = new Map<string, { period_end: string; value: string | null }[]>();
  for (const item of pl ?? []) {
    if (!byLabel.has(item.label)) byLabel.set(item.label, []);
    byLabel.get(item.label)!.push(item);
  }
  return HEADLINE_LABELS.filter((l) => byLabel.has(l))
    .map((l) => {
      const rows = byLabel.get(l)!.slice().sort((a, b) => b.period_end.localeCompare(a.period_end));
      return `${l}: ${rows[0]?.value ?? '—'} (prior ${rows[1]?.value ?? '—'}, prior-2 ${rows[2]?.value ?? '—'})`;
    })
    .join('\n');
}

async function fundamentalsSlice(symbol: string): Promise<AnalystSlice> {
  const [company, ratios, pl, shareholding, peers] = await Promise.all([
    getCompany(symbol),
    getRatios(symbol),
    getFinancials(symbol, 'profit_and_loss'),
    getShareholding(symbol),
    getPeers(symbol),
  ]);
  if (!company) return { text: 'No fundamentals data was available for this company.', hadData: false };

  const ratioLine = (ratios ?? [])
    .slice(0, 18)
    .map((r) => `${r.name}: ${r.value ?? '—'}${r.unit ? ` ${r.unit}` : ''}`)
    .join('; ');
  const shByCat = new Map<string, string>();
  for (const s of (shareholding ?? []).slice().sort((a, b) => b.quarter_end.localeCompare(a.quarter_end))) {
    if (!shByCat.has(s.category)) shByCat.set(s.category, s.percentage);
  }
  const peerLine = (peers ?? [])
    .filter((p) => !p.is_target)
    .slice(0, 6)
    .map((p) => `${p.name} (P/E ${p.pe ?? '—'}, ROCE ${p.roce_pct ?? '—'}%)`)
    .join('; ');

  return {
    hadData: true,
    text: [
      `${company.name} (${symbol}) — ${company.sector ?? 'sector n/a'} / ${company.industry ?? 'industry n/a'}.`,
      company.about ? `About: ${company.about.slice(0, 600)}` : '',
      `Ratios: ${ratioLine || '(none)'}.`,
      `Recent P&L (latest vs prior periods):\n${financialsPivot(pl) || '(none)'}`,
      `Latest shareholding: ${[...shByCat].map(([c, p]) => `${c} ${p}%`).join(', ') || '(none)'}.`,
      `Peers: ${peerLine || '(none)'}.`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

async function newsSentimentSlice(symbol: string, userId: string | null): Promise<AnalystSlice> {
  const [news, grounding] = await Promise.all([
    getNews({ symbols: [symbol], limit: 12 }),
    retrieveInsightGrounding({
      query: `${symbol} recent developments results risks news`,
      userId,
      symbol,
      docTypes: ['news', 'filing'],
      limit: 8,
    }),
  ]);
  const items = news.items ?? [];
  const hadData = items.length > 0 || grounding.passages.length > 0;
  const headlineBlock = items.length
    ? items
        .map((n) => `- [${n.sentiment}] ${n.title} — ${n.source}, ${n.published_at.slice(0, 10)}`)
        .join('\n')
    : '(no recent headlines)';
  return {
    hadData,
    text: [
      'Recent headlines (the tag is an automated tone label, not a market call):',
      headlineBlock,
      grounding.passages.length
        ? `\nRetrieved passages:\n${grounding.passages.map((p) => `- (${p.source}) ${p.text}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

async function technicalSlice(symbol: string): Promise<AnalystSlice> {
  const prices = await getPrices(symbol, '1y');
  const closes = (prices ?? []).map((p) => Number(p.close)).filter((c) => Number.isFinite(c) && c > 0);
  if (closes.length < 20) return { text: 'Not enough price history for a technical read.', hadData: false };
  const t = summariseTechnicals(closes);
  return {
    hadData: true,
    text: [
      `Price action over ~1 year (${t.points} sessions):`,
      `Last close ${money(t.lastClose)}; period return ${t.periodReturnPct?.toFixed(1) ?? '—'}%.`,
      `SMA20 ${money(t.sma20 && Math.round(t.sma20))}, SMA50 ${money(t.sma50 && Math.round(t.sma50))} — last close is ${t.aboveSma20 ? 'above' : 'below'} the 20-day and ${t.aboveSma50 ? 'above' : 'below'} the 50-day.`,
      `RSI(14): ${t.rsi14?.toFixed(0) ?? '—'}. Max drawdown from a recent high: ${t.maxDrawdownPct?.toFixed(1) ?? '—'}%.`,
      `20/50-day moving-average cross in the last few sessions: ${t.cross === 'none' ? 'none' : t.cross}.`,
    ].join('\n'),
  };
}

async function macroSlice(): Promise<AnalystSlice> {
  const [indices, broadNews] = await Promise.all([getIndices(), getNews({ limit: 8 })]);
  const idx = indices ?? [];
  const news = broadNews.items ?? [];
  const hadData = idx.length > 0 || news.length > 0;
  return {
    hadData,
    text: [
      'Broad-market backdrop (context only — not a call on this stock):',
      idx.length
        ? idx.map((i) => `${i.name}: ${i.value} (${i.change_pct}%)`).join('; ')
        : '(no index data)',
      news.length
        ? `\nMarket headlines:\n${news.map((n) => `- [${n.sentiment}] ${n.title}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export async function gatherAnalystContext(
  symbol: string,
  userId: string | null
): Promise<AnalystContext> {
  const [fundamentals, news_sentiment, technical, macro] = await Promise.all([
    fundamentalsSlice(symbol),
    newsSentimentSlice(symbol, userId),
    technicalSlice(symbol),
    macroSlice(),
  ]);
  return { fundamentals, news_sentiment, technical, macro };
}
