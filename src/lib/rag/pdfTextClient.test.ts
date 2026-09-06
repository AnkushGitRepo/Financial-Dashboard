import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchPdfText } = await import('./pdfTextClient');

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

beforeEach(() => {
  vi.stubEnv('IPO_INGEST_TOKEN', 'tok');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fetchPdfText', () => {
  it('returns null when no IPO_INGEST_TOKEN is set', async () => {
    vi.stubEnv('IPO_INGEST_TOKEN', '');
    expect(await fetchPdfText('https://x/a.pdf')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('POSTs the url with a bearer token and maps the response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      okJson({ text: 'hello', page_count: 3, bytes: 42 })
    );
    const out = await fetchPdfText('https://x/a.pdf', { maxPages: 50 });
    expect(out).toEqual({ text: 'hello', pageCount: 3, bytes: 42 });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/documents/extract-text');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ url: 'https://x/a.pdf', max_pages: 50 });
  });

  it('returns null on a non-OK response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false } as Response);
    expect(await fetchPdfText('https://x/a.pdf')).toBeNull();
  });

  it('returns null when the body has no text', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(okJson({ page_count: 0 }));
    expect(await fetchPdfText('https://x/a.pdf')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
    expect(await fetchPdfText('https://x/a.pdf')).toBeNull();
  });
});
