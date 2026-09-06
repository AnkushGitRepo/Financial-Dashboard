import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/currentUserId';
import { getUserAiConfig } from '@/lib/ai/userAiConfig';
import { generateInsightText } from '@/lib/ai/generate';
import { PORTFOLIO_SYSTEM } from '@/lib/ai/prompts';
import { buildPortfolioPrompt } from '@/lib/ai/insightPrompts';
import { getOrGenerate, hashInput } from '@/lib/insights';
import { getEnrichedHoldings } from '@/lib/dashboard/enrichedHoldings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TTL_MS = 6 * 60 * 60 * 1000;
const bodySchema = z.object({ force: z.boolean().optional() }).optional();

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const force = parsed.success ? parsed.data?.force : false;

  const aiConfig = await getUserAiConfig(userId);
  if (!aiConfig) {
    return NextResponse.json(
      { success: false, error: 'no_ai_key', hint: 'Add your AI provider key in Settings.' },
      { status: 400 }
    );
  }

  const holdings = await getEnrichedHoldings(userId);
  if (holdings.length === 0) {
    return NextResponse.json({ success: false, error: 'No holdings to analyse yet.' }, { status: 400 });
  }

  const input = {
    holdings: holdings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      sector: h.sector,
      quantity: h.quantity,
      avgPrice: h.avgPrice,
      ltp: h.ltp,
    })),
  };

  const result = await getOrGenerate({
    scope: 'portfolio',
    key: 'portfolio',
    userId,
    inputHash: hashInput(input),
    ttlMs: TTL_MS,
    force,
    generate: async () => {
      const gen = await generateInsightText(aiConfig, PORTFOLIO_SYSTEM, buildPortfolioPrompt(input));
      return gen.ok ? { content: gen.text, model: gen.model } : { error: gen.error };
    },
  });

  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  return NextResponse.json({ success: true, data: result.insight, meta: { cached: result.cached } });
}
