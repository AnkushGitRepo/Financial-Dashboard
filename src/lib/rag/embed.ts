// Local sentence embeddings for retrieval (Phase 10 / ADR 0020).
//
// Runs in-process via transformers.js + onnxruntime — no embedding API key,
// no network at query time once the model is cached. BYO-key stays limited
// to *generation*.
//
// `@huggingface/transformers` is imported **lazily** inside `getPipeline()`:
// on a host where its native onnxruntime binary can't load (e.g. a Vercel
// serverless function missing `libonnxruntime.so`), the import throws at
// call time — which `retrieve()` and the indexer already catch — instead of
// crashing every route that transitively imports this module at cold start.
//
// Model: all-MiniLM-L6-v2 (384-dim, ~23 MB quantised) by default. Mean
// pooling + L2 normalise, so a plain dot product is cosine similarity —
// what the Atlas Vector Search index is configured for.
//
// Config (all optional):
//   RAG_EMBED_MODEL       HF repo id or local dir name (default below)
//   RAG_MODEL_CACHE_DIR   where downloaded weights are cached (default /tmp/...)
//   RAG_LOCAL_MODEL_PATH  serve weights from disk only, no Hub fetch

import type { FeatureExtractionPipeline } from '@huggingface/transformers';

export const DEFAULT_EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
/** Output dimensionality of the default model. Must match the Atlas index. */
export const EMBED_DIM = 384;

const MODEL_ID = process.env.RAG_EMBED_MODEL || DEFAULT_EMBED_MODEL;

let pipe: Promise<FeatureExtractionPipeline> | null = null;

/** Lazily import transformers.js, configure it once, and build (then reuse)
 *  the feature-extraction pipeline. The first call pays the model load. */
function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipe) {
    pipe = (async () => {
      const { env, pipeline } = await import('@huggingface/transformers');
      env.cacheDir = process.env.RAG_MODEL_CACHE_DIR || '/tmp/mm-transformers-cache';
      env.useFSCache = true;
      if (process.env.RAG_LOCAL_MODEL_PATH) {
        env.localModelPath = process.env.RAG_LOCAL_MODEL_PATH;
        env.allowLocalModels = true;
        env.allowRemoteModels = false;
      }
      return pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' });
    })();
  }
  return pipe;
}

/** Embed many strings at once. Returns one unit vector per input, in order.
 *  An empty input list resolves to `[]` without loading the model. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getPipeline();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  return output.tolist() as number[][];
}

/** Embed a single query string to one unit vector. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  return vector;
}

/** For tests / callers that need to reset the cached pipeline. */
export function __resetEmbedPipelineForTests(): void {
  pipe = null;
}
