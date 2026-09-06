// Thin server-side client for the fundamentals-api's
// `POST /documents/extract-text` (Phase 10 / ADR 0020). Used by the corpus
// indexer to turn an annual-report / DRHP PDF URL into text for chunking.
//
// Guarded by the same `IPO_INGEST_TOKEN` shared secret the service's other
// trusted-caller route uses. Returns `null` on any failure — the indexer
// treats "no text" and "couldn't fetch" the same way.

const BASE_URL = process.env.FUNDAMENTALS_API_URL ?? 'http://localhost:8420';

export interface PdfTextResult {
  text: string;
  pageCount: number;
  bytes: number;
}

export async function fetchPdfText(
  url: string,
  opts: { maxPages?: number; timeoutMs?: number } = {}
): Promise<PdfTextResult | null> {
  const token = process.env.IPO_INGEST_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(`${BASE_URL}/documents/extract-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, max_pages: opts.maxPages ?? null }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { text?: string; page_count?: number; bytes?: number };
    if (!body.text) return null;
    return { text: body.text, pageCount: body.page_count ?? 0, bytes: body.bytes ?? 0 };
  } catch {
    return null;
  }
}
