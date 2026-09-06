import { NextResponse } from 'next/server';
import { evaluateAlerts } from '@/lib/alerts/evaluate';
import { isNseSession } from '@/lib/alerts/marketHours';

// The alert-evaluation entry point (ADR 0014 §3). Invoked by Vercel Cron
// (which issues a GET and, when CRON_SECRET is set, an
// `Authorization: Bearer <CRON_SECRET>` header) and by self-hosters' own
// schedulers hitting the same URL with the same header. Not session auth.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorize(request: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        status: 503,
        error: 'CRON_SECRET is not configured — refusing to run the evaluation loop unauthenticated',
      };
    }
    return { ok: true }; // local dev convenience
  }
  const header = request.headers.get('authorization');
  if (header !== `Bearer ${secret}`) {
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
  const force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true';
  const now = new Date();

  if (!force && !isNseSession(now)) {
    return NextResponse.json({
      success: true,
      data: { ran: false, reason: 'outside NSE trading session', at: now.toISOString() },
    });
  }

  try {
    const summary = await evaluateAlerts(now);
    return NextResponse.json({ success: true, data: { ran: true, at: now.toISOString(), ...summary } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'evaluation failed' },
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
