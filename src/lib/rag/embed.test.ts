import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { embedBatch, embedQuery, EMBED_DIM } = await import('./embed');

const okJson = (vectors: number[][]) => ({ ok: true, json: async () => ({ vectors }) }) as Response;

beforeEach(() => {
  vi.stubEnv('IPO_INGEST_TOKEN', 'tok');
  vi.stubEnv('FUNDAMENTALS_API_URL', 'https://fapi.test');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('embedBatch', () => {
  it('short-circuits an empty batch without a request', async () => {
    expect(await embedBatch([])).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws when IPO_INGEST_TOKEN is unset', async () => {
    vi.stubEnv('IPO_INGEST_TOKEN', '');
    await expect(embedBatch(['a'])).rejects.toThrow(/IPO_INGEST_TOKEN/);
  });

  it('POSTs texts with a bearer token and returns the vectors in order', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      okJson([
        [0.1, 0.2],
        [0.3, 0.4],
      ])
    );
    const out = await embedBatch(['a', 'b']);
    expect(out).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toBe('https://fapi.test/embed');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ texts: ['a', 'b'] });
  });

  it('chunks a large batch into <=64-text requests', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (_u, init: RequestInit) => {
      const { texts } = JSON.parse(init.body as string) as { texts: string[] };
      return okJson(texts.map(() => [1]));
    });
    const out = await embedBatch(Array.from({ length: 150 }, (_, i) => `t${i}`));
    expect(out).toHaveLength(150);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3); // 64 + 64 + 22
  });

  it('throws on a non-OK response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(embedBatch(['a'])).rejects.toThrow(/503/);
  });

  it('throws when the vector count does not match the input', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(okJson([[0.1]]));
    await expect(embedBatch(['a', 'b'])).rejects.toThrow(/unexpected shape/);
  });
});

describe('embedQuery', () => {
  it('returns the single vector, not a nested array', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(okJson([[0.9, 0.8, 0.7]]));
    expect(await embedQuery('hi')).toEqual([0.9, 0.8, 0.7]);
  });
});

describe('EMBED_DIM', () => {
  it('is 384 (matches the Atlas index + the /embed model)', () => {
    expect(EMBED_DIM).toBe(384);
  });
});
