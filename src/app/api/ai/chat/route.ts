import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
import type { ModelMessage } from 'ai';
import { getCurrentUserId } from '@/lib/currentUserId';
import { getUserAiConfig } from '@/lib/ai/userAiConfig';
import { streamChat } from '@/lib/ai/generate';
import { CHAT_SYSTEM_AGENTIC } from '@/lib/ai/prompts';
import { buildChatTools } from '@/lib/ai/chatTools';
import { formatChatContext, mergeNews } from '@/lib/ai/chatContext';
import { appendTurn, clearHistory, recentUserQuestions } from '@/lib/chat/chatHistory';
import { syncRecentChat } from '@/lib/rag/userSync';
import { getEnrichedHoldings } from '@/lib/dashboard/enrichedHoldings';
import { getNews } from '@/lib/dashboard/newsApi';

export const dynamic = 'force-dynamic';
// A tool-calling turn can take several round-trips (retrieval embed +
// fundamentals-api calls); give it more room than a plain completion.
export const maxDuration = 120;
const MAX_TOOL_STEPS = 5;

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

// A small always-present seed: the portfolio summary + a few headlines.
// The model reaches for `search_context` / the data tools for anything
// beyond this.
async function buildContext(userId: string): Promise<string> {
  const holdings = await getEnrichedHoldings(userId).catch(() => []);
  const symbols = holdings.map((h) => h.symbol);
  const [specific, broad] = await Promise.all([
    symbols.length
      ? getNews({ symbols, limit: 6 })
      : Promise.resolve({ items: [], next_cursor: null }),
    getNews({ limit: 4 }),
  ]);
  return formatChatContext(holdings, mergeNews(specific.items, broad.items));
}

async function handlePOST(request: Request) {
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
  const system = `${CHAT_SYSTEM_AGENTIC}\n\n--- PORTFOLIO CONTEXT ---\n${context}`;
  const tools = buildChatTools(userId);
  const lastUserMessage = parsed.data.messages.at(-1)?.content ?? '';

  try {
    const result = streamChat(aiConfig, system, parsed.data.messages as ModelMessage[], {
      tools,
      maxSteps: MAX_TOOL_STEPS,
      onFinish: async ({ text }) => {
        if (!text.trim() || !lastUserMessage) return;
        await appendTurn(userId, lastUserMessage, text);
        void syncRecentChat(userId, await recentUserQuestions(userId));
      },
    });
    return result.toTextStreamResponse();
  } catch {
    return NextResponse.json({ error: 'The AI request failed. Please try again.' }, { status: 502 });
  }
}

async function handleDELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const removed = await clearHistory(userId);
  void syncRecentChat(userId, []);
  return NextResponse.json({ success: true, data: { removed } });
}

export const POST = withRateLimit(handlePOST, 'ai');
export const DELETE = handleDELETE;
