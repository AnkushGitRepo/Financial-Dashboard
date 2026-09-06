import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/currentUserId';
import { paramsSchemaForType, updateAlertSchema } from '@/lib/alerts/schemas';
import { deleteAlert, getAlertById, updateAlert } from '@/lib/alerts/store';
import type { AlertParams } from '@/lib/alerts/types';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  }

  const existing = await getAlertById(userId, id);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
  }

  // `params` can only be validated once we know the alert's type.
  let validatedParams: Omit<AlertParams, 'type'> | undefined;
  if (parsed.data.params !== undefined) {
    const paramsParsed = paramsSchemaForType(existing.type).safeParse(parsed.data.params);
    if (!paramsParsed.success) {
      return NextResponse.json(
        { success: false, error: paramsParsed.error.message },
        { status: 422 }
      );
    }
    validatedParams = paramsParsed.data as Omit<AlertParams, 'type'>;
  }

  const alert = await updateAlert(userId, id, {
    params: validatedParams,
    note: parsed.data.note,
    status: parsed.data.status,
    rearm: parsed.data.rearm,
    cooldownMinutes: parsed.data.cooldownMinutes,
  });
  if (!alert) {
    return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: alert });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await deleteAlert(userId, id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: null });
}
