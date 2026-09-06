// The retrieval read path for Phase 10 (ADR 0020).
//
// Embeds the query locally, runs Atlas `$vectorSearch` over
// `{ userId: null } ∪ { userId: <caller> }`, and returns the top windows.
// Returns `null` — never throws — whenever retrieval can't run (non-Atlas
// MongoDB, missing index, embedding failure) so callers fall back to the
// pre-Phase-10 prompt-stuffing path instead of degrading the surface.

import { chunksCollection, VECTOR_INDEX_NAME, type ChunkDocType } from './chunks';
import { embedQuery } from './embed';

export interface RetrievedChunk {
  text: string;
  score: number;
  source: string;
  sourceUrl: string | null;
  title: string | null;
  docType: ChunkDocType;
  symbol: string | null;
  publishedAt: Date | null;
}

export interface RetrieveOptions {
  query: string;
  /** The caller. `null` restricts retrieval to the shared public corpus. */
  userId: string | null;
  /** Restrict to these document types (default: all). */
  docTypes?: ChunkDocType[];
  /** Uppercase NSE symbol — returns this stock's chunks plus non-stock
   *  chunks, excluding other stocks' chunks. */
  symbol?: string;
  /** Max results (default 6). */
  limit?: number;
  /** ANN candidate pool before limiting (default `limit * 20`). */
  numCandidates?: number;
  /** Drop matches below this vectorSearchScore (default 0 — keep all). */
  minScore?: number;
}

/** MQL match on the indexed filter fields, passed to `$vectorSearch`. */
export function buildRetrievalFilter(opts: RetrieveOptions): Record<string, unknown> {
  const and: Record<string, unknown>[] = [
    { userId: { $in: opts.userId ? [null, opts.userId] : [null] } },
  ];
  if (opts.docTypes && opts.docTypes.length > 0) {
    and.push({ docType: { $in: opts.docTypes } });
  }
  if (opts.symbol) {
    and.push({ $or: [{ symbol: opts.symbol }, { symbol: null }] });
  }
  return and.length === 1 ? and[0] : { $and: and };
}

export async function retrieve(opts: RetrieveOptions): Promise<RetrievedChunk[] | null> {
  const limit = opts.limit ?? 6;
  const numCandidates = opts.numCandidates ?? limit * 20;
  const minScore = opts.minScore ?? 0;

  let vector: number[];
  try {
    vector = await embedQuery(opts.query);
  } catch {
    return null;
  }
  if (!Array.isArray(vector) || vector.length === 0) return null;

  try {
    const col = await chunksCollection();
    const rows = await col
      .aggregate<RetrievedChunk>([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: 'vector',
            queryVector: vector,
            numCandidates,
            limit,
            filter: buildRetrievalFilter(opts),
          },
        },
        {
          $project: {
            _id: 0,
            text: 1,
            source: 1,
            sourceUrl: 1,
            title: 1,
            docType: 1,
            symbol: 1,
            publishedAt: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    return rows.filter((r) => r.score >= minScore);
  } catch {
    return null;
  }
}
