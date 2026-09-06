import { beforeEach, describe, expect, it, vi } from 'vitest';

type IndexSpec = { name: string; key: Record<string, number>; unique?: boolean };
type SearchIndexDef = {
  name: string;
  type: string;
  definition: { fields: Array<Record<string, unknown>> };
};
type BulkOp = {
  updateOne: {
    filter: Record<string, unknown>;
    update: { $set: Record<string, unknown>; $setOnInsert: Record<string, unknown> };
    upsert: boolean;
  };
};

/** A hand-rolled fake of the bits of a MongoDB collection these helpers use. */
function makeFakeCollection(existingDocs: Array<{ chunkIndex: number; hash: string }> = []) {
  return {
    createIndexes: vi.fn<(specs: IndexSpec[]) => Promise<void>>(() => Promise.resolve()),
    listSearchIndexes: vi.fn<() => { toArray: () => Promise<Array<{ name: string }>> }>(() => ({
      toArray: async () => [],
    })),
    createSearchIndex: vi.fn<(def: SearchIndexDef) => Promise<string>>(() =>
      Promise.resolve('chunks_vector')
    ),
    find: vi.fn(() => ({ toArray: async () => existingDocs })),
    bulkWrite: vi.fn<(ops: BulkOp[]) => Promise<{ ok: number }>>(() => Promise.resolve({ ok: 1 })),
    deleteMany: vi.fn<(filter: Record<string, unknown>) => Promise<{ deletedCount: number }>>(() =>
      Promise.resolve({ deletedCount: 0 })
    ),
  };
}

let fakeCol: ReturnType<typeof makeFakeCollection>;
vi.mock('@/lib/mongodb', () => ({
  getDb: async () => ({ collection: () => fakeCol }),
}));

const { chunkHash, replaceSourceChunks, deleteSourceChunks, deleteUserChunks, ensureChunksIndexes } =
  await import('./chunks');

const meta = { docType: 'news' as const, userId: null, symbol: 'RELIANCE' };
const win = (chunkIndex: number, text: string) => ({ chunkIndex, text, vector: [0.1, 0.2] });

beforeEach(() => {
  fakeCol = makeFakeCollection();
});

describe('chunkHash', () => {
  it('is stable for the same inputs and changes with the text', () => {
    const a = chunkHash('src', 0, 'hello world');
    expect(chunkHash('src', 0, 'hello world')).toBe(a);
    expect(chunkHash('src', 0, 'hello worlds')).not.toBe(a);
    expect(chunkHash('src', 1, 'hello world')).not.toBe(a);
    expect(a).toHaveLength(32);
  });
});

describe('replaceSourceChunks', () => {
  it('writes nothing when the stored windows already match', async () => {
    const windows = [win(0, 'alpha'), win(1, 'beta')];
    fakeCol = makeFakeCollection(
      windows.map((w) => ({ chunkIndex: w.chunkIndex, hash: chunkHash('a', w.chunkIndex, w.text) }))
    );
    const res = await replaceSourceChunks('a', meta, windows);
    expect(res).toEqual({ changed: false, written: 0, pruned: 0 });
    expect(fakeCol.bulkWrite).not.toHaveBeenCalled();
    expect(fakeCol.deleteMany).not.toHaveBeenCalled();
  });

  it('upserts each window and prunes trailing windows from a longer prior version', async () => {
    fakeCol = makeFakeCollection([
      { chunkIndex: 0, hash: 'old0' },
      { chunkIndex: 1, hash: 'old1' },
      { chunkIndex: 2, hash: 'old2' },
    ]);
    fakeCol.deleteMany.mockResolvedValueOnce({ deletedCount: 1 });

    const res = await replaceSourceChunks('a', meta, [win(0, 'new'), win(1, 'text')]);

    expect(res).toEqual({ changed: true, written: 2, pruned: 1 });
    const ops = fakeCol.bulkWrite.mock.calls[0][0];
    expect(ops).toHaveLength(2);
    expect(ops[0].updateOne.filter).toEqual({ source: 'a', chunkIndex: 0 });
    expect(ops[0].updateOne.upsert).toBe(true);
    expect(ops[0].updateOne.update.$set.symbol).toBe('RELIANCE');
    expect(fakeCol.deleteMany).toHaveBeenCalledWith({ source: 'a', chunkIndex: { $gte: 2 } });
  });
});

describe('delete helpers', () => {
  it('deleteSourceChunks filters by source', async () => {
    fakeCol.deleteMany.mockResolvedValueOnce({ deletedCount: 3 });
    expect(await deleteSourceChunks('note:42')).toBe(3);
    expect(fakeCol.deleteMany).toHaveBeenCalledWith({ source: 'note:42' });
  });

  it('deleteUserChunks filters by userId', async () => {
    fakeCol.deleteMany.mockResolvedValueOnce({ deletedCount: 12 });
    expect(await deleteUserChunks('user_abc')).toBe(12);
    expect(fakeCol.deleteMany).toHaveBeenCalledWith({ userId: 'user_abc' });
  });
});

describe('ensureChunksIndexes', () => {
  it('always ensures the scalar indexes', async () => {
    await ensureChunksIndexes();
    const names = fakeCol.createIndexes.mock.calls[0][0].map((i: { name: string }) => i.name);
    expect(names).toEqual(['source_chunk', 'hash', 'user_type', 'published_desc']);
  });

  it('creates the vector index when absent', async () => {
    const res = await ensureChunksIndexes();
    expect(res.vectorIndex).toBe('created');
    const def = fakeCol.createSearchIndex.mock.calls[0][0];
    expect(def.name).toBe('chunks_vector');
    expect(def.type).toBe('vectorSearch');
    expect(def.definition.fields[0]).toMatchObject({ path: 'vector', numDimensions: 384 });
  });

  it('reports "exists" without recreating', async () => {
    fakeCol.listSearchIndexes.mockReturnValueOnce({
      toArray: async () => [{ name: 'chunks_vector' }],
    });
    const res = await ensureChunksIndexes();
    expect(res.vectorIndex).toBe('exists');
    expect(fakeCol.createSearchIndex).not.toHaveBeenCalled();
  });

  it('degrades to "unavailable" on a non-Atlas MongoDB', async () => {
    fakeCol.listSearchIndexes.mockImplementationOnce(() => {
      throw new Error('search index commands are only supported on Atlas');
    });
    const res = await ensureChunksIndexes();
    expect(res.vectorIndex).toBe('unavailable');
    expect(res.detail).toMatch(/Atlas/);
  });
});
