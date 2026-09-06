// Corpus indexer for Phase 10 (ADR 0020) — builds the *shared* public
// retrieval corpus (`userId: null`). Runs as a scheduled job
// (`POST /api/cron/index-corpus`), never inline in a user request.
//
// This module owns the news path. Filing (annual-report / DRHP) indexing
// is layered on separately; it reuses `indexTextDocument` here.

import { getNews, type NewsItem } from '@/lib/dashboard/newsApi';
import { chunkText } from './chunk';
import {
  chunksCollection,
  ensureChunksIndexes,
  replaceSourceChunks,
  type ChunkMeta,
  type EnsureIndexesResult,
} from './chunks';
import { embedBatch } from './embed';

/** Cap the windows embedded for one document so a 400-page DRHP can't blow
 *  a single cron run's time budget. */
const MAX_WINDOWS_PER_DOC = 400;
const EMBED_BATCH = 32;

export interface IndexCorpusOptions {
  /** How many recent news items to (re)consider per run. Default 150. */
  newsLimit?: number;
  /** Prune news chunks whose publishedAt is older than this. Default 45. */
  newsRetentionDays?: number;
  now?: Date;
}

export interface IndexCorpusResult {
  vectorIndex: EnsureIndexesResult['vectorIndex'];
  news: { seen: number; changed: number; pruned: number };
  errors: string[];
}

/** Embed `windows` (in batches) and upsert them as the chunks for `source`. */
export async function indexTextDocument(
  source: string,
  meta: ChunkMeta,
  text: string
): Promise<{ changed: boolean; windows: number }> {
  const windows = chunkText(text).slice(0, MAX_WINDOWS_PER_DOC);
  if (windows.length === 0) {
    // Nothing extractable — drop any stale chunks for this source.
    await replaceSourceChunks(source, meta, []);
    return { changed: false, windows: 0 };
  }

  const vectors: number[][] = [];
  for (let i = 0; i < windows.length; i += EMBED_BATCH) {
    const batch = windows.slice(i, i + EMBED_BATCH).map((w) => w.text);
    vectors.push(...(await embedBatch(batch)));
  }

  const res = await replaceSourceChunks(
    source,
    meta,
    windows.map((w, i) => ({ chunkIndex: w.index, text: w.text, vector: vectors[i] }))
  );
  return { changed: res.changed, windows: windows.length };
}

function newsText(item: NewsItem): string {
  return [item.title, item.summary].filter((s): s is string => Boolean(s && s.trim())).join('\n\n');
}

function newsMeta(item: NewsItem): ChunkMeta {
  const published = new Date(item.published_at);
  return {
    docType: 'news',
    userId: null,
    symbol: item.symbols[0]?.toUpperCase() ?? null,
    sourceUrl: item.url,
    title: item.title,
    publishedAt: Number.isNaN(published.getTime()) ? null : published,
  };
}

async function pruneOldNews(now: Date, retentionDays: number): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const col = await chunksCollection();
  const res = await col.deleteMany({ docType: 'news', publishedAt: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}

export async function indexCorpus(options: IndexCorpusOptions = {}): Promise<IndexCorpusResult> {
  const now = options.now ?? new Date();
  const newsLimit = options.newsLimit ?? 150;
  const retentionDays = options.newsRetentionDays ?? 45;
  const errors: string[] = [];

  const indexes = await ensureChunksIndexes();
  if (indexes.vectorIndex === 'unavailable' && indexes.detail) {
    errors.push(`vector index unavailable: ${indexes.detail}`);
  }

  const page = await getNews({ limit: newsLimit });
  let changed = 0;
  for (const item of page.items) {
    if (!item.url || !newsText(item)) continue;
    try {
      const res = await indexTextDocument(item.url, newsMeta(item), newsText(item));
      if (res.changed) changed += 1;
    } catch (err) {
      errors.push(`news ${item.url}: ${err instanceof Error ? err.message : 'failed'}`);
    }
  }

  let pruned = 0;
  try {
    pruned = await pruneOldNews(now, retentionDays);
  } catch (err) {
    errors.push(`prune: ${err instanceof Error ? err.message : 'failed'}`);
  }

  return {
    vectorIndex: indexes.vectorIndex,
    news: { seen: page.items.length, changed, pruned },
    errors,
  };
}
