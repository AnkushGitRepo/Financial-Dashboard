import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/currentUserId';
import { createAlertSchema } from '@/lib/alerts/schemas';
import { createAlert, listAlerts } from '@/lib/alerts/store';
import type { AlertParams } from '@/lib/alerts/types';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  const alerts = await listAlerts(userId);
  return NextResponse.json({ success: true, data: alerts });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  }

  const d = parsed.data;
  const alert = await createAlert(userId, {
    type: d.type,
    symbol: 'symbol' in d && d.symbol ? d.symbol : null,
    params: d.params as Omit<AlertParams, 'type'>,
    note: d.note ?? null,
    rearm: d.rearm,
    cooldownMinutes: d.cooldownMinutes,
  });
  return NextResponse.json({ success: true, data: alert }, { status: 201 });
}
