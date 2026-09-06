import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { Notification, NotificationPayload } from './types';

interface NotificationDocument {
  _id: ObjectId;
  userId: string;
  kind: Notification['kind'];
  title: string;
  body: string;
  href: string | null;
  meta: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

function toNotification(doc: NotificationDocument): Notification {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    kind: doc.kind,
    title: doc.title,
    body: doc.body,
    href: doc.href,
    meta: doc.meta,
    read: doc.read,
    createdAt: doc.createdAt,
  };
}

async function collection() {
  const db = await getDb();
  return db.collection<NotificationDocument>('notifications');
}

/** Writes the in-app record. Always called by `deliverNotification` — the
 * in-app centre is the delivery baseline that works in every mode. */
export async function insertNotification(
  userId: string,
  payload: NotificationPayload
): Promise<Notification> {
  const col = await collection();
  const doc: NotificationDocument = {
    _id: new ObjectId(),
    userId,
    kind: payload.kind,
    title: payload.title,
    body: payload.body,
    href: payload.href ?? null,
    meta: payload.meta ?? {},
    read: false,
    createdAt: new Date(),
  };
  await col.insertOne(doc);
  return toNotification(doc);
}

export async function listNotifications(
  userId: string,
  limit = 50
): Promise<{ items: Notification[]; unread: number }> {
  const col = await collection();
  const [docs, unread] = await Promise.all([
    col.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray(),
    col.countDocuments({ userId, read: false }),
  ]);
  return { items: docs.map(toNotification), unread };
}

/** Mark one notification read, or (id omitted) all of the user's. */
export async function markRead(userId: string, id?: string): Promise<number> {
  const col = await collection();
  if (id === undefined) {
    const result = await col.updateMany({ userId, read: false }, { $set: { read: true } });
    return result.modifiedCount;
  }
  if (!ObjectId.isValid(id)) return 0;
  const result = await col.updateOne({ _id: new ObjectId(id), userId }, { $set: { read: true } });
  return result.modifiedCount;
}
