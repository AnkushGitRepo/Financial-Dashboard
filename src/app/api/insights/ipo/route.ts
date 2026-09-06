import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/currentUserId';
import { getAiConfig } from '@/lib/ai/userAiConfig';
import { generateInsightText } from '@/lib/ai/generate';
import { IPO_SYSTEM } from '@/lib/ai/prompts';
import { buildIpoPrompt } from '@/lib/ai/insightPrompts';
import { getOrGenerate, hashInput } from '@/lib/insights';
import { getIpos } from '@/lib/dashboard/iposApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TTL_MS = 12 * 60 * 60 * 1000;
const bodySchema = z.object({ slug: z.string().trim().min(1).max(160), force: z.boolean().optional() });

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  const { slug, force } = parsed.data;

  // IPO briefs are shared reference content — the deployment's key is
  // allowed here (ADR 0018 §5); it falls back to the requesting user's key.
  const aiConfig = await getAiConfig(userId, { allowEnv: true });
  if (!aiConfig) {
    return NextResponse.json(
      { success: false, error: 'no_ai_key', hint: 'Add your AI provider key in Settings.' },
      { status: 400 }
    );
  }

  const ipo = (await getIpos()).find((i) => i.slug === slug);
  if (!ipo) {
    return NextResponse.json({ success: false, error: 'That IPO is not in the current list.' }, { status: 404 });
  }

  const input = {
    ipo: {
      name: ipo.name,
      category: ipo.category,
      status: ipo.status,
      price: ipo.price,
      ipo_size_cr: ipo.ipo_size_cr,
      lot_size: ipo.lot_size,
      subscription_times: ipo.subscription_times,
      gmp: ipo.gmp,
      gmp_pct: ipo.gmp_pct,
      open_date: ipo.open_date,
      close_date: ipo.close_date,
      listing_date: ipo.listing_date,
      anchor: ipo.anchor,
    },
    drhpExtract: null as string | null, // DRHP grounding is Phase 8 pt.4
  };

  const result = await getOrGenerate({
    scope: 'ipo',
    key: slug,
    userId: null, // shared across users
    inputHash: hashInput(input),
    ttlMs: TTL_MS,
    force,
    generate: async () => {
      const gen = await generateInsightText(aiConfig, IPO_SYSTEM, buildIpoPrompt(input));
      return gen.ok ? { content: gen.text, model: gen.model } : { error: gen.error };
    },
  });

  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  return NextResponse.json({ success: true, data: result.insight, meta: { cached: result.cached } });
}
