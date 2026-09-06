// Sentence embeddings for retrieval (Phase 10 / ADR 0020).
//
// The main app can't run ONNX embeddings in its own Vercel serverless
// runtime (`onnxruntime-node` can't load `libonnxruntime.so.1` there), so
// this delegates to `services/fundamentals-api`'s `POST /embed` (fastembed,
// `BAAI/bge-small-en-v1.5`, 384-dim, L2-normalised → dot product = cosine).
// Self-host runs that service too, so this path is identical in both modes.
//
// Both functions **throw** on any failure (no token, service down, non-200).
// Callers already treat that as "no retrieval": `retrieve()` returns `null`,
// the indexer collects a per-item error, `userSync` returns `false`.

const baseUrl = () => process.env.FUNDAMENTALS_API_URL ?? 'http://localhost:8420';

/** Output dimensionality of the embedding model. Must match the Atlas
 *  Vector Search index definition in `chunks.ts`. */
export const EMBED_DIM = 384;

/** Keep in step with `MAX_TEXTS` on the Python `/embed` route. */
const MAX_BATCH = 64;
const DEFAULT_TIMEOUT_MS = 45_000;

export interface EmbedOptions {
  /** Per-request timeout. The first call on a cold service instance pays a
   *  one-time model download (~15-20s), so keep this generous for batch
   *  work and shorter for interactive queries. */
  timeoutMs?: number;
}

export async function embedBatch(texts: string[], opts: EmbedOptions = {}): Promise<number[][]> {
  if (texts.length === 0) return [];

  const token = process.env.IPO_INGEST_TOKEN;
  if (!token) {
    throw new Error('IPO_INGEST_TOKEN is not set — cannot reach the embedding service');
  }

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const slice = texts.slice(i, i + MAX_BATCH);
    const response = await fetch(`${baseUrl()}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ texts: slice }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`embedding service returned ${response.status}`);
    }
    const body = (await response.json()) as { vectors?: number[][] };
    if (!body.vectors || body.vectors.length !== slice.length) {
      throw new Error('embedding service returned an unexpected shape');
    }
    out.push(...body.vectors);
  }
  return out;
}

/** Embed a single query string. Uses a tighter timeout — an interactive
 *  caller (chat / an insight card) should fall back fast, not hang. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text], { timeoutMs: 20_000 });
  return vector;
}
