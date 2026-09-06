// User-authored notes (Phase 10 / ADR 0020) — a small per-user store that
// also feeds the caller's private retrieval corpus. "Keep a note on why I
// hold X", "watch this sector", etc.

import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export interface UserNote {
  id: string;
  userId: string;
  title: string;
  body: string;
  /** Optional uppercase NSE symbol the note is about. */
  symbol: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserNoteDoc {
  _id: ObjectId;
  userId: string;
  title: string;
  body: string;
  symbol: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const MAX_TITLE = 140;
export const MAX_BODY = 4000;
export const MAX_NOTES_PER_USER = 200;

function toNote(doc: UserNoteDoc): UserNote {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title,
    body: doc.body,
    symbol: doc.symbol,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function collection() {
  const db = await getDb();
  return db.collection<UserNoteDoc>('userNotes');
}

export async function listNotes(userId: string): Promise<UserNote[]> {
  const col = await collection();
  const docs = await col.find({ userId }).sort({ updatedAt: -1 }).toArray();
  return docs.map(toNote);
}

export async function getNote(userId: string, id: string): Promise<UserNote | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id), userId });
  return doc ? toNote(doc) : null;
}

export interface NoteInput {
  title: string;
  body: string;
  symbol?: string | null;
}

function normalize(input: NoteInput): Pick<UserNoteDoc, 'title' | 'body' | 'symbol'> {
  return {
    title: input.title.trim().slice(0, MAX_TITLE),
    body: input.body.trim().slice(0, MAX_BODY),
    symbol: input.symbol ? input.symbol.trim().toUpperCase().slice(0, 30) || null : null,
  };
}

export async function createNote(userId: string, input: NoteInput): Promise<UserNote | null> {
  const col = await collection();
  if ((await col.countDocuments({ userId })) >= MAX_NOTES_PER_USER) return null;
  const now = new Date();
  const doc: UserNoteDoc = {
    _id: new ObjectId(),
    userId,
    ...normalize(input),
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return toNote(doc);
}

export async function updateNote(
  userId: string,
  id: string,
  input: NoteInput
): Promise<UserNote | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const res = await col.findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    { $set: { ...normalize(input), updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return res ? toNote(res) : null;
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await collection();
  const res = await col.deleteOne({ _id: new ObjectId(id), userId });
  return (res.deletedCount ?? 0) > 0;
}
