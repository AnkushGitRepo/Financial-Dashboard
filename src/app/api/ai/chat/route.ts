import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ModelMessage } from 'ai';
import { getCurrentUserId } from '@/lib/currentUserId';
import { getUserAiConfig } from '@/lib/ai/userAiConfig';
import { streamChat } from '@/lib/ai/generate';
import { CHAT_SYSTEM } from '@/lib/ai/prompts';
import { formatChatContext, mergeNews } from '@/lib/ai/chatContext';
import { getEnrichedHoldings } from '@/lib/dashboard/enrichedHoldings';
import { getNews } from '@/lib/dashboard/newsApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_TURNS = 12;
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .min(1)
    .max(MAX_TURNS),
});

async function buildContext(userId: string): Promise<string> {
  const holdings = await getEnrichedHoldings(userId).catch(() => []);
  const symbols = holdings.map((h) => h.symbol);
  const [specific, broad] = await Promise.all([
    symbols.length ? getNews({ symbols, limit: 8 }) : Promise.resolve({ items: [], next_cursor: null }),
    getNews({ limit: 6 }),
  ]);
  return formatChatContext(holdings, mergeNews(specific.items, broad.items));
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 });

  // Mitra is a per-user surface — the caller's own key (or, in self-host,
  // the deployment env key). Never the hosted operator's key (ADR 0018 §2).
  const aiConfig = await getUserAiConfig(userId);
  if (!aiConfig) {
    return NextResponse.json(
      { error: 'no_ai_key', hint: 'Add your AI provider key in Settings.' },
      { status: 400 }
    );
  }

  const context = await buildContext(userId);
  const system = `${CHAT_SYSTEM}\n\n--- CONTEXT (the only data you may use) ---\n${context}`;

  try {
    const result = streamChat(aiConfig, system, parsed.data.messages as ModelMessage[]);
    return result.toTextStreamResponse();
  } catch {
    return NextResponse.json({ error: 'The AI request failed. Please try again.' }, { status: 502 });
  }
}
