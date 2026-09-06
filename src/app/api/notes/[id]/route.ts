import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/currentUserId';
import { deleteNote, MAX_BODY, MAX_TITLE, updateNote } from '@/lib/notes/userNotes';
import { removeUserNote, syncUserNote } from '@/lib/rag/userSync';

const noteSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE),
  body: z.string().trim().min(1).max(MAX_BODY),
  symbol: z.string().trim().max(30).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  }

  const note = await updateNote(userId, id, parsed.data);
  if (!note) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

  void syncUserNote(userId, note);

  return NextResponse.json({ success: true, data: note });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const ok = await deleteNote(userId, id);
  if (!ok) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

  void removeUserNote(id);

  return NextResponse.json({ success: true, data: { id } });
}
