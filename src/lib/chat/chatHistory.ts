// Chat-turn persistence (Phase 10 / ADR 0020). Mitra was stateless; now
// each completed turn is stored so the user's recent questions can feed
// their private retrieval layer ("saved questions") and the history is
// user-clearable. The chat widget still sends the full visible transcript
// on each request, so this store is NOT read back to reconstruct context.

import { getDb } from '@/lib/mongodb';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  userId: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

/** Rolling cap per user — oldest messages beyond this are pruned on write. */
export const MAX_MESSAGES_PER_USER = 100;
const MAX_CONTENT = 4000;

async function collection() {
  const db = await getDb();
  return db.collection<ChatMessage>('chatMessages');
}

/** Store one completed exchange (the user's message + Mitra's reply) and
 *  prune anything past the per-user cap. Never throws. */
export async function appendTurn(
  userId: string,
  userContent: string,
  assistantContent: string
): Promise<void> {
  try {
    const col = await collection();
    const now = new Date();
    await col.insertMany([
      { userId, role: 'user', content: userContent.slice(0, MAX_CONTENT), createdAt: now },
      {
        userId,
        role: 'assistant',
        content: assistantContent.slice(0, MAX_CONTENT),
        createdAt: new Date(now.getTime() + 1),
      },
    ]);

    const total = await col.countDocuments({ userId });
    if (total > MAX_MESSAGES_PER_USER) {
      const overflow = await col
        .find({ userId })
        .sort({ createdAt: 1 })
        .limit(total - MAX_MESSAGES_PER_USER)
        .toArray();
      const cutoff = overflow.at(-1)?.createdAt;
      if (cutoff) await col.deleteMany({ userId, createdAt: { $lte: cutoff } });
    }
  } catch {
    /* history is best-effort */
  }
}

export async function recentUserQuestions(userId: string, limit = 20): Promise<string[]> {
  try {
    const col = await collection();
    const rows = await col
      .find({ userId, role: 'user' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return rows.map((r) => r.content).reverse();
  } catch {
    return [];
  }
}

export async function clearHistory(userId: string): Promise<number> {
  const col = await collection();
  const res = await col.deleteMany({ userId });
  return res.deletedCount ?? 0;
}
