import { beforeEach, describe, expect, it, vi } from 'vitest';

const { col } = vi.hoisted(() => ({
  col: { findOne: vi.fn(), updateOne: vi.fn(async () => ({})) },
}));
vi.mock('@/lib/mongodb', () => ({ getDb: async () => ({ collection: () => col }) }));

import { getOrGenerate, hashInput } from './insights';

const HASH = hashInput({ a: 1 });
const args = (over: Partial<Parameters<typeof getOrGenerate>[0]> = {}) => ({
  scope: 'stock' as const,
  key: 'RELIANCE',
  userId: 'u1',
  inputHash: HASH,
  ttlMs: 60_000,
  generate: vi.fn(async () => ({ content: 'fresh insight', model: 'test' })),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('hashInput', () => {
  it('is stable regardless of key order', () => {
    expect(hashInput({ a: 1, b: [2, 3] })).toBe(hashInput({ b: [2, 3], a: 1 }));
  });
  it('changes when a value changes', () => {
    expect(hashInput({ a: 1 })).not.toBe(hashInput({ a: 2 }));
  });
});

describe('getOrGenerate', () => {
  it('returns the cache when fresh + hash matches, without calling generate', async () => {
    col.findOne.mockResolvedValue({
      inputHash: HASH,
      content: 'cached',
      model: 'm',
      generatedAt: new Date(),
    });
    const a = args();
    const res = await getOrGenerate(a);
    expect(res).toMatchObject({ ok: true, cached: true });
    expect(a.generate).not.toHaveBeenCalled();
  });

  it('regenerates when the input hash changed', async () => {
    col.findOne.mockResolvedValue({
      inputHash: 'stale-hash',
      content: 'old',
      model: 'm',
      generatedAt: new Date(),
    });
    const a = args();
    const res = await getOrGenerate(a);
    expect(res).toMatchObject({ ok: true, cached: false });
    expect(a.generate).toHaveBeenCalledOnce();
    expect(col.updateOne).toHaveBeenCalledOnce();
  });

  it('regenerates when the cache is stale', async () => {
    col.findOne.mockResolvedValue({
      inputHash: HASH,
      content: 'old',
      model: 'm',
      generatedAt: new Date(Date.now() - 120_000),
    });
    const a = args({ ttlMs: 60_000 });
    const res = await getOrGenerate(a);
    expect(res).toMatchObject({ ok: true, cached: false });
    expect(a.generate).toHaveBeenCalledOnce();
  });

  it('force bypasses a fresh cache', async () => {
    col.findOne.mockResolvedValue({
      inputHash: HASH,
      content: 'cached',
      model: 'm',
      generatedAt: new Date(),
    });
    const a = args({ force: true });
    const res = await getOrGenerate(a);
    expect(res).toMatchObject({ cached: false });
    expect(a.generate).toHaveBeenCalledOnce();
  });

  it('generates on a cache miss', async () => {
    col.findOne.mockResolvedValue(null);
    const a = args();
    const res = await getOrGenerate(a);
    expect(res).toMatchObject({ ok: true, cached: false });
    if (res.ok) expect(res.insight.content).toBe('fresh insight');
  });

  it('propagates a generation error and does not write', async () => {
    col.findOne.mockResolvedValue(null);
    const a = args({ generate: vi.fn(async () => ({ error: 'bad key' })) });
    const res = await getOrGenerate(a);
    expect(res).toEqual({ ok: false, error: 'bad key' });
    expect(col.updateOne).not.toHaveBeenCalled();
  });
});
