import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/currentUserId';
import { deleteHolding, updateHolding } from '@/lib/holdings';

const updateHoldingSchema = z.object({
  quantity: z.number().positive(),
  avgPrice: z.number().positive(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateHoldingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  }

  const holding = await updateHolding(userId, id, parsed.data);
  if (!holding) {
    return NextResponse.json({ success: false, error: 'Holding not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: holding });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteHolding(userId, id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Holding not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: null });
}
