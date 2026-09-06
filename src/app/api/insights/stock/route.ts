import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/currentUserId';
import { getUserAiConfig } from '@/lib/ai/userAiConfig';
import { generateInsightText } from '@/lib/ai/generate';
import { STOCK_SYSTEM } from '@/lib/ai/prompts';
import { buildStockPrompt } from '@/lib/ai/insightPrompts';
import { getOrGenerate, hashInput } from '@/lib/insights';
import {
  getCompany,
  getFinancials,
  getPrices,
  getRatios,
  getShareholding,
} from '@/lib/dashboard/fundamentalsApi';
import { getNews } from '@/lib/dashboard/newsApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TTL_MS = 24 * 60 * 60 * 1000;
const bodySchema = z.object({ symbol: z.string().trim().min(1).max(20), force: z.boolean().optional() });

async function handlePOST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  const symbol = parsed.data.symbol.toUpperCase();

  const aiConfig = await getUserAiConfig(userId);
  if (!aiConfig) {
    return NextResponse.json(
      { success: false, error: 'no_ai_key', hint: 'Add your AI provider key in Settings.' },
      { status: 400 }
    );
  }

  const [company, ratios, pl, shareholding, prices, news] = await Promise.all([
    getCompany(symbol),
    getRatios(symbol),
    getFinancials(symbol, 'profit_and_loss'),
    getShareholding(symbol),
    getPrices(symbol, '1mo'),
    getNews({ symbols: [symbol], limit: 5 }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: 'Could not load data for that symbol.' }, { status: 502 });
  }

  // Pivot P&L: last two periods for a handful of headline labels.
  const labels = ['Sales', 'Net Profit', 'Operating Profit', 'EPS', 'Revenue', 'Profit before tax'];
  const byLabel = new Map<string, { period_end: string; value: string | null }[]>();
  for (const item of pl ?? []) {
    if (!byLabel.has(item.label)) byLabel.set(item.label, []);
    byLabel.get(item.label)!.push({ period_end: item.period_end, value: item.value });
  }
  const financialsSummary = labels
    .filter((l) => byLabel.has(l))
    .map((l) => {
      const rows = byLabel.get(l)!.sort((a, b) => b.period_end.localeCompare(a.period_end));
      return { label: l, latest: rows[0]?.value ?? null, prior: rows[1]?.value ?? null };
    });

  const closes = (prices ?? []).filter((p) => p.close !== null).map((p) => Number(p.close));

  const shByCat = new Map<string, string>();
  for (const s of (shareholding ?? []).sort((a, b) => b.quarter_end.localeCompare(a.quarter_end))) {
    if (!shByCat.has(s.category)) shByCat.set(s.category, s.percentage);
  }

  const input = {
    symbol,
    company: {
      name: company.name,
      sector: company.sector,
      industry: company.industry,
      about: company.about ? company.about.slice(0, 800) : null,
    },
    ratios: (ratios ?? []).slice(0, 14).map((r) => ({ name: r.name, value: r.value, unit: r.unit })),
    latestClose: closes[0] ?? null,
    financialsSummary,
    shareholdingLatest: [...shByCat].map(([category, percentage]) => ({ category, percentage })),
    news: news.items.map((n) => ({ title: n.title, sentiment: n.sentiment, published_at: n.published_at })),
  };

  const result = await getOrGenerate({
    scope: 'stock',
    key: symbol,
    userId,
    inputHash: hashInput(input),
    ttlMs: TTL_MS,
    force: parsed.data.force,
    generate: async () => {
      const gen = await generateInsightText(aiConfig, STOCK_SYSTEM, buildStockPrompt(input));
      return gen.ok ? { content: gen.text, model: gen.model } : { error: gen.error };
    },
  });

  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  return NextResponse.json({ success: true, data: result.insight, meta: { cached: result.cached } });
}

export const POST = withRateLimit(handlePOST, 'ai');
