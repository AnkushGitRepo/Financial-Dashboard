import { NextResponse } from 'next/server';
import { searchSymbols } from '@/lib/dashboard/fundamentalsApi';

// A thin proxy — a narrow, deliberate exception to the "consume
// fundamentals-api directly from Server Components" rule (ADR 0012):
// live-as-you-type search needs a same-origin endpoint the browser can call
// without CORS setup on the Python service, and without exposing
// FUNDAMENTALS_API_URL to client code.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return NextResponse.json([]);
  }
  const results = await searchSymbols(q);
  return NextResponse.json(results);
}
