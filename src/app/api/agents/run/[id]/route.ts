import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/currentUserId';
import { getRunForUser, toView } from '@/lib/agents/store';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const doc = await getRunForUser(userId, id);
  if (!doc) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: toView(doc) });
}
