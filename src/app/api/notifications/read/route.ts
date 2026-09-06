import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/currentUserId';
import { markRead } from '@/lib/notifications/store';

// Body: `{}` or `{ all: true }` marks every unread notification read;
// `{ id: "<notificationId>" }` marks just that one.
const readSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ all: z.literal(true) }),
  z.object({}).strict(),
]);

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = readSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  }

  const id = 'id' in parsed.data ? parsed.data.id : undefined;
  const updated = await markRead(userId, id);
  return NextResponse.json({ success: true, data: { updated } });
}
