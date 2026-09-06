import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A fake feature-extraction pipeline: records calls, returns a tensor-like
// object whose `.tolist()` yields one row per input.
const extractor = vi.fn((texts: string[]) => ({
  tolist: () => texts.map((_, i) => [i + 0.1, i + 0.2, i + 0.3]),
}));
const pipeline = vi.fn(async () => extractor);

vi.mock('@huggingface/transformers', () => ({
  pipeline,
  env: {},
}));

const { embedBatch, embedQuery, __resetEmbedPipelineForTests, EMBED_DIM } = await import('./embed');

beforeEach(() => {
  pipeline.mockClear();
  extractor.mockClear();
  __resetEmbedPipelineForTests();
});
afterEach(() => __resetEmbedPipelineForTests());

describe('embed', () => {
  it('short-circuits an empty batch without loading the model', async () => {
    expect(await embedBatch([])).toEqual([]);
    expect(pipeline).not.toHaveBeenCalled();
  });

  it('returns one vector per input, in order', async () => {
    const out = await embedBatch(['a', 'b']);
    expect(out).toEqual([
      [0.1, 0.2, 0.3],
      [1.1, 1.2, 1.3],
    ]);
  });

  it('requests mean pooling + normalisation (cosine-ready vectors)', async () => {
    await embedBatch(['x']);
    expect(extractor).toHaveBeenCalledWith(['x'], { pooling: 'mean', normalize: true });
  });

  it('builds the pipeline once and reuses it across calls', async () => {
    await embedBatch(['one']);
    await embedBatch(['two']);
    await embedQuery('three');
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(pipeline).toHaveBeenCalledWith('feature-extraction', expect.any(String), { dtype: 'q8' });
  });

  it('embedQuery returns the single row, not a nested array', async () => {
    expect(await embedQuery('hello')).toEqual([0.1, 0.2, 0.3]);
  });

  it('exposes the model dimensionality for the vector index', () => {
    expect(EMBED_DIM).toBe(384);
  });
});
