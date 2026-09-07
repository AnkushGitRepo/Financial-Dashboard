// Phase 11 Part C — write a "lessons" reflection on a finished run, with
// hindsight (ADR 0021). Compares the debate's key claims to what the price
// actually did over a short window. Never a verdict on the stock.

import { generateInsightText } from '@/lib/ai/generate';
import { getUserAiConfig } from '@/lib/ai/userAiConfig';
import { getPrices } from '@/lib/dashboard/fundamentalsApi';
import { REFLECT_SYSTEM } from './prompts';
import { patchRun, type AgentRunDoc } from './store';
import { REFLECTION_HORIZON_DAYS, type Reflection } from './types';

export interface ReflectOutcome {
  id: string;
  status: 'written' | 'skipped' | 'error';
  detail?: string;
}

export async function reflectOnRun(doc: AgentRunDoc): Promise<ReflectOutcome> {
  const id = doc._id.toString();

  const config = await getUserAiConfig(doc.userId);
  if (!config) return { id, status: 'skipped', detail: 'no AI key for this account' };
  if (!doc.briefing || doc.keyClaims.length === 0) {
    return { id, status: 'skipped', detail: 'nothing to reflect on' };
  }

  const prices = await getPrices(doc.symbol, '1y');
  const priceAtReflection =
    (prices ?? []).map((p) => Number(p.close)).filter((c) => Number.isFinite(c) && c > 0).at(-1) ?? null;
  const movePct =
    doc.priceAtRun && priceAtReflection && doc.priceAtRun > 0
      ? ((priceAtReflection - doc.priceAtRun) / doc.priceAtRun) * 100
      : null;

  const horizonDays = Math.max(
    REFLECTION_HORIZON_DAYS,
    Math.round((Date.now() - doc.createdAt.getTime()) / (24 * 60 * 60 * 1000))
  );

  const prompt = [
    `Stock: ${doc.companyName ?? doc.symbol} (${doc.symbol}).`,
    `Price at the time of the panel: ${doc.priceAtRun ?? '—'}. Price now: ${priceAtReflection ?? '—'} — a move of ${movePct != null ? `${movePct.toFixed(1)}%` : '—'} over about ${horizonDays} days.`,
    '',
    'The claims the debate turned on:',
    ...doc.keyClaims.map((c) => `- [${c.side}] ${c.claim}`),
    '',
    'The briefing:',
    doc.briefing,
  ].join('\n');

  const gen = await generateInsightText(config, REFLECT_SYSTEM, prompt, { maxOutputTokens: 500 });
  if (!gen.ok) return { id, status: 'error', detail: gen.error };

  const reflection: Reflection = {
    writtenAt: new Date().toISOString(),
    horizonDays,
    priceAtRun: doc.priceAtRun,
    priceAtReflection,
    movePct,
    lessons: gen.text,
  };
  await patchRun(id, { reflection });
  return { id, status: 'written' };
}
