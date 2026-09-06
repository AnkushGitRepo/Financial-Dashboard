import { NextResponse } from 'next/server';
import { ensureChunksIndexes } from '@/lib/rag/chunks';
import { indexCorpus } from '@/lib/rag/indexer';

// Rebuilds the shared retrieval corpus for Phase 10 (ADR 0020): pulls
// recent news, chunks + embeds it locally, upserts into `chunks` with
// `userId: null`, and prunes stale news. Invoked by the `index-corpus`
// GitHub Actions schedule (and self-hosters' own schedulers) with an
// `Authorization: Bearer <CRON_SECRET>` header — not session auth.
//
// `?indexesOnly=1` just ensures the collection + Atlas Vector Search
// indexes exist and returns — the one-time setup step for a self-host.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorize(request: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        status: 503,
        error: 'CRON_SECRET is not configured — refusing to run the indexer unauthenticated',
      };
    }
    return { ok: true }; // local dev convenience
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

async function handle(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);

  if (url.searchParams.get('indexesOnly') === '1') {
    const result = await ensureChunksIndexes();
    return NextResponse.json({ success: true, data: { indexesOnly: true, ...result } });
  }

  const newsLimitRaw = Number(url.searchParams.get('newsLimit'));
  const newsLimit = Number.isFinite(newsLimitRaw) && newsLimitRaw > 0 ? newsLimitRaw : undefined;

  try {
    const started = Date.now();
    const result = await indexCorpus({ newsLimit });
    return NextResponse.json({
      success: true,
      data: { ...result, ms: Date.now() - started },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'indexing failed' },
      { status: 500 }
    );
  }
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
