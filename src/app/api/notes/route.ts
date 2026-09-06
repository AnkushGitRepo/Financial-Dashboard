import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/currentUserId';
import { createNote, listNotes, MAX_BODY, MAX_TITLE } from '@/lib/notes/userNotes';
import { syncUserNote } from '@/lib/rag/userSync';

const noteSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE),
  body: z.string().trim().min(1).max(MAX_BODY),
  symbol: z.string().trim().max(30).optional().nullable(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ success: true, data: await listNotes(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
  }

  const note = await createNote(userId, parsed.data);
  if (!note) {
    return NextResponse.json(
      { success: false, error: 'Note limit reached (200). Delete some first.' },
      { status: 409 }
    );
  }

  // Index into the user's private corpus layer — best-effort.
  void syncUserNote(userId, note);

  return NextResponse.json({ success: true, data: note }, { status: 201 });
}
