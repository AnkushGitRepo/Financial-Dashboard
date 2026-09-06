import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/currentUserId';
import { listNotifications } from '@/lib/notifications/store';

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get('limit'));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 50;

  const { items, unread } = await listNotifications(userId, limit);
  return NextResponse.json({ success: true, data: items, meta: { unread } });
}
