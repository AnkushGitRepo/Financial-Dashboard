// Keeps a user's private retrieval layer (ADR 0020) in step with their
// notes and holdings. Called fire-and-forget from the notes routes and
// after a holdings mutation — a sync failure must never fail the write, so
// every function here swallows its errors and returns a boolean.

import { getEnrichedHoldings, type EnrichedHolding } from '@/lib/dashboard/enrichedHoldings';
import type { UserNote } from '@/lib/notes/userNotes';
import { chunkText } from './chunk';
import { deleteSourceChunks, replaceSourceChunks, type ChunkMeta } from './chunks';
import { embedBatch } from './embed';

async function embedAndReplace(source: string, meta: ChunkMeta, text: string): Promise<boolean> {
  try {
    const windows = chunkText(text);
    if (windows.length === 0) {
      await replaceSourceChunks(source, meta, []);
      return true;
    }
    const vectors = await embedBatch(windows.map((w) => w.text));
    await replaceSourceChunks(
      source,
      meta,
      windows.map((w, i) => ({ chunkIndex: w.index, text: w.text, vector: vectors[i] }))
    );
    return true;
  } catch {
    return false;
  }
}

export function noteSource(noteId: string): string {
  return `note:${noteId}`;
}

export async function syncUserNote(userId: string, note: UserNote): Promise<boolean> {
  return embedAndReplace(
    noteSource(note.id),
    {
      docType: 'note',
      userId,
      symbol: note.symbol,
      title: note.title || 'Note',
      publishedAt: note.updatedAt,
    },
    [note.title, note.body].filter(Boolean).join('\n\n')
  );
}

export async function removeUserNote(noteId: string): Promise<boolean> {
  try {
    await deleteSourceChunks(noteSource(noteId));
    return true;
  } catch {
    return false;
  }
}

/** Re-embed a compact snapshot of the user's holdings as one source. */
export async function syncUserHoldings(
  userId: string,
  holdings: Pick<EnrichedHolding, 'symbol' | 'name' | 'sector' | 'quantity' | 'avgPrice' | 'ltp'>[]
): Promise<boolean> {
  if (holdings.length === 0) {
    try {
      await deleteSourceChunks(`holdings:${userId}`);
      return true;
    } catch {
      return false;
    }
  }
  const lines = holdings.map((h) => {
    const value = h.ltp != null ? h.ltp * h.quantity : null;
    const pl = value != null ? value - h.avgPrice * h.quantity : null;
    return `${h.name} (${h.symbol})${h.sector ? `, ${h.sector}` : ''}: qty ${h.quantity}, avg ₹${h.avgPrice}${
      h.ltp != null ? `, LTP ₹${h.ltp}` : ''
    }${pl != null ? `, unrealised P&L ₹${Math.round(pl)}` : ''}`;
  });
  return embedAndReplace(
    `holdings:${userId}`,
    { docType: 'holdings', userId, title: 'My holdings', publishedAt: new Date() },
    `Current holdings:\n${lines.join('\n')}`
  );
}

/** Embed the user's recent chat questions as one `chat:<userId>` source
 *  ("saved questions" — ADR 0020). Best-effort. */
export async function syncRecentChat(userId: string, questions: string[]): Promise<boolean> {
  const trimmed = questions.map((q) => q.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    try {
      await deleteSourceChunks(`chat:${userId}`);
      return true;
    } catch {
      return false;
    }
  }
  return embedAndReplace(
    `chat:${userId}`,
    { docType: 'chat', userId, title: 'My recent questions', publishedAt: new Date() },
    `Questions this user has recently asked Mitra:\n${trimmed.map((q) => `- ${q}`).join('\n')}`
  );
}

/** Fire-and-forget helper for the holdings mutation routes: fetch the
 *  user's enriched holdings and re-embed the snapshot. Swallows everything. */
export async function resyncUserHoldings(userId: string): Promise<void> {
  try {
    const holdings = await getEnrichedHoldings(userId);
    await syncUserHoldings(userId, holdings);
  } catch {
    /* best-effort */
  }
}
