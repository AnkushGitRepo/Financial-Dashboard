import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RetrievedChunk } from './retrieve';

const embedQuery = vi.fn<(t: string) => Promise<number[]>>();
vi.mock('./embed', () => ({ embedQuery: (t: string) => embedQuery(t) }));

type Pipeline = Array<Record<string, unknown>>;
const aggregate = vi.fn<(p: Pipeline) => { toArray: () => Promise<RetrievedChunk[]> }>();
vi.mock('./chunks', () => ({
  VECTOR_INDEX_NAME: 'chunks_vector',
  chunksCollection: async () => ({ aggregate }),
}));

const { retrieve, buildRetrievalFilter } = await import('./retrieve');

const row = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  text: 'chunk text',
  score: 0.8,
  source: 'https://x/a',
  sourceUrl: 'https://x/a',
  title: 'A headline',
  docType: 'news',
  symbol: 'RELIANCE',
  publishedAt: null,
  ...over,
});

beforeEach(() => {
  embedQuery.mockReset();
  aggregate.mockReset();
  embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
  aggregate.mockReturnValue({ toArray: async () => [row()] });
});

describe('buildRetrievalFilter', () => {
  it('reads shared-only when the caller is anonymous', () => {
    expect(buildRetrievalFilter({ query: 'q', userId: null })).toEqual({
      userId: { $in: [null] },
    });
  });

  it('unions the shared corpus with the caller’s private layer', () => {
    expect(buildRetrievalFilter({ query: 'q', userId: 'u1' })).toEqual({
      userId: { $in: [null, 'u1'] },
    });
  });

  it('adds docType and symbol constraints under $and', () => {
    const f = buildRetrievalFilter({
      query: 'q',
      userId: 'u1',
      docTypes: ['news', 'filing'],
      symbol: 'TCS',
    });
    expect(f).toEqual({
      $and: [
        { userId: { $in: [null, 'u1'] } },
        { docType: { $in: ['news', 'filing'] } },
        { $or: [{ symbol: 'TCS' }, { symbol: null }] },
      ],
    });
  });
});

describe('retrieve', () => {
  it('builds a $vectorSearch + score-projection pipeline', async () => {
    await retrieve({ query: 'why did reliance drop', userId: 'u1', limit: 4 });
    const pipeline = aggregate.mock.calls[0][0];
    const vs = pipeline[0].$vectorSearch as Record<string, unknown>;
    expect(vs.index).toBe('chunks_vector');
    expect(vs.queryVector).toEqual([0.1, 0.2, 0.3]);
    expect(vs.limit).toBe(4);
    expect(vs.numCandidates).toBe(80);
    expect(vs.filter).toEqual({ userId: { $in: [null, 'u1'] } });
    expect(pipeline[1].$project).toMatchObject({ score: { $meta: 'vectorSearchScore' } });
  });

  it('drops matches below minScore', async () => {
    aggregate.mockReturnValue({
      toArray: async () => [row({ score: 0.9 }), row({ score: 0.4 }), row({ score: 0.2 })],
    });
    const out = await retrieve({ query: 'q', userId: null, minScore: 0.5 });
    expect(out).toHaveLength(1);
    expect(out![0].score).toBe(0.9);
  });

  it('returns null when embedding fails', async () => {
    embedQuery.mockRejectedValue(new Error('model load failed'));
    expect(await retrieve({ query: 'q', userId: null })).toBeNull();
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('returns null on an empty embedding', async () => {
    embedQuery.mockResolvedValue([]);
    expect(await retrieve({ query: 'q', userId: null })).toBeNull();
  });

  it('returns null when the aggregation throws (no index / non-Atlas)', async () => {
    aggregate.mockImplementation(() => {
      throw new Error('$vectorSearch is not allowed');
    });
    expect(await retrieve({ query: 'q', userId: 'u1' })).toBeNull();
  });
});
