import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewsItem } from '@/lib/dashboard/newsApi';

const getNews = vi.fn<() => Promise<{ items: NewsItem[]; next_cursor: null }>>();
vi.mock('@/lib/dashboard/newsApi', () => ({ getNews: () => getNews() }));

const embedBatch = vi.fn<(t: string[]) => Promise<number[][]>>();
vi.mock('./embed', () => ({ embedBatch: (t: string[]) => embedBatch(t) }));

const ensureChunksIndexes = vi.fn();
const replaceSourceChunks = vi.fn();
const deleteMany = vi.fn<(f: unknown) => Promise<{ deletedCount: number }>>();
vi.mock('./chunks', () => ({
  ensureChunksIndexes: () => ensureChunksIndexes(),
  replaceSourceChunks: (...a: unknown[]) => replaceSourceChunks(...a),
  chunksCollection: async () => ({ deleteMany }),
}));

const { indexCorpus, indexTextDocument } = await import('./indexer');

const item = (over: Partial<NewsItem> = {}): NewsItem => ({
  url: 'https://ex.com/a',
  title: 'Reliance Q2 profit rises 10%',
  summary: 'The company reported higher refining margins.',
  source: 'Example',
  published_at: '2026-09-01T00:00:00.000Z',
  sentiment: 'positive',
  sentiment_score: 0.5,
  symbols: ['RELIANCE'],
  ...over,
});

beforeEach(() => {
  getNews.mockReset();
  embedBatch.mockReset();
  ensureChunksIndexes.mockReset();
  replaceSourceChunks.mockReset();
  deleteMany.mockReset();

  ensureChunksIndexes.mockResolvedValue({ vectorIndex: 'exists' });
  embedBatch.mockImplementation(async (texts) => texts.map(() => [0.1, 0.2, 0.3]));
  replaceSourceChunks.mockResolvedValue({ changed: true, written: 1, pruned: 0 });
  deleteMany.mockResolvedValue({ deletedCount: 0 });
});

describe('indexTextDocument', () => {
  it('chunks, embeds, and upserts under the given source + meta', async () => {
    const meta = { docType: 'news' as const, userId: null, symbol: 'RELIANCE' };
    const res = await indexTextDocument('src-1', meta, 'A sentence. Another sentence.');
    expect(res.windows).toBe(1);
    expect(res.changed).toBe(true);
    const [source, passedMeta, windows] = replaceSourceChunks.mock.calls[0];
    expect(source).toBe('src-1');
    expect(passedMeta).toBe(meta);
    expect(windows[0]).toMatchObject({ chunkIndex: 0, vector: [0.1, 0.2, 0.3] });
  });

  it('clears stale chunks and embeds nothing for empty text', async () => {
    const res = await indexTextDocument('src-2', { docType: 'filing', userId: null }, '   ');
    expect(res).toEqual({ changed: false, windows: 0 });
    expect(embedBatch).not.toHaveBeenCalled();
    expect(replaceSourceChunks).toHaveBeenCalledWith('src-2', expect.anything(), []);
  });
});

describe('indexCorpus', () => {
  it('ensures indexes, indexes each news item, and reports counts', async () => {
    getNews.mockResolvedValue({ items: [item(), item({ url: 'https://ex.com/b' })], next_cursor: null });
    const res = await indexCorpus({ now: new Date('2026-09-06T00:00:00Z') });

    expect(ensureChunksIndexes).toHaveBeenCalled();
    expect(res.news).toEqual({ seen: 2, changed: 2, pruned: 0 });
    expect(res.vectorIndex).toBe('exists');
    expect(res.errors).toEqual([]);

    const firstMeta = replaceSourceChunks.mock.calls[0][1];
    expect(firstMeta).toMatchObject({ docType: 'news', userId: null, symbol: 'RELIANCE' });
    expect(firstMeta.publishedAt).toBeInstanceOf(Date);
  });

  it('skips items with no url or no text, without counting them as changed', async () => {
    getNews.mockResolvedValue({
      items: [item({ url: '' }), item({ title: '', summary: null })],
      next_cursor: null,
    });
    const res = await indexCorpus();
    expect(res.news.changed).toBe(0);
    expect(replaceSourceChunks).not.toHaveBeenCalled();
  });

  it('collects a per-item error and still finishes the run', async () => {
    getNews.mockResolvedValue({ items: [item(), item({ url: 'https://ex.com/b' })], next_cursor: null });
    replaceSourceChunks.mockRejectedValueOnce(new Error('write failed'));
    const res = await indexCorpus();
    expect(res.news.changed).toBe(1);
    expect(res.errors[0]).toContain('write failed');
  });

  it('prunes news chunks older than the retention window', async () => {
    getNews.mockResolvedValue({ items: [], next_cursor: null });
    deleteMany.mockResolvedValue({ deletedCount: 7 });
    const res = await indexCorpus({ now: new Date('2026-09-06T00:00:00Z'), newsRetentionDays: 30 });
    expect(res.news.pruned).toBe(7);
    const filter = deleteMany.mock.calls[0][0] as { docType: string; publishedAt: { $lt: Date } };
    expect(filter.docType).toBe('news');
    expect(filter.publishedAt.$lt.toISOString()).toBe('2026-08-07T00:00:00.000Z');
  });

  it('surfaces an unavailable vector index as a non-fatal error', async () => {
    ensureChunksIndexes.mockResolvedValue({ vectorIndex: 'unavailable', detail: 'not Atlas' });
    getNews.mockResolvedValue({ items: [], next_cursor: null });
    const res = await indexCorpus();
    expect(res.vectorIndex).toBe('unavailable');
    expect(res.errors[0]).toContain('not Atlas');
  });
});
