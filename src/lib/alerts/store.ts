import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { Alert, AlertParams, AlertStatus } from './types';

interface AlertDocument {
  _id: ObjectId;
  userId: string;
  type: Alert['type'];
  symbol: string | null;
  params: Omit<AlertParams, 'type'>;
  note: string | null;
  status: AlertStatus;
  rearm: boolean;
  cooldownMinutes: number;
  armed: boolean;
  cooldownUntil: Date | null;
  lastEvaluatedAt: Date | null;
  triggeredAt: Date | null;
  lastObservedValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

function toAlert(doc: AlertDocument): Alert {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    type: doc.type,
    symbol: doc.symbol,
    params: doc.params,
    note: doc.note,
    status: doc.status,
    rearm: doc.rearm,
    cooldownMinutes: doc.cooldownMinutes,
    armed: doc.armed,
    cooldownUntil: doc.cooldownUntil,
    lastEvaluatedAt: doc.lastEvaluatedAt,
    triggeredAt: doc.triggeredAt,
    lastObservedValue: doc.lastObservedValue,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function collection() {
  const db = await getDb();
  return db.collection<AlertDocument>('alerts');
}

export interface CreateAlertInput {
  type: Alert['type'];
  symbol: string | null;
  params: Omit<AlertParams, 'type'>;
  note?: string | null;
  rearm?: boolean;
  cooldownMinutes?: number;
}

export async function listAlerts(userId: string): Promise<Alert[]> {
  const col = await collection();
  const docs = await col.find({ userId }).sort({ createdAt: -1 }).toArray();
  return docs.map(toAlert);
}

export async function getAlertById(userId: string, id: string): Promise<Alert | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id), userId });
  return doc ? toAlert(doc) : null;
}

/** Every alert the evaluation cron should look at this cycle — active,
 * across all users. */
export async function listActiveAlerts(): Promise<Alert[]> {
  const col = await collection();
  const docs = await col.find({ status: 'active' }).toArray();
  return docs.map(toAlert);
}

export async function createAlert(userId: string, input: CreateAlertInput): Promise<Alert> {
  const col = await collection();
  const now = new Date();
  const doc: AlertDocument = {
    _id: new ObjectId(),
    userId,
    type: input.type,
    symbol: input.symbol ? input.symbol.toUpperCase() : null,
    params: input.params,
    note: input.note?.trim() || null,
    status: 'active',
    rearm: input.rearm ?? false,
    cooldownMinutes: input.cooldownMinutes ?? 60,
    armed: true,
    cooldownUntil: null,
    lastEvaluatedAt: null,
    triggeredAt: null,
    lastObservedValue: null,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return toAlert(doc);
}

export interface UpdateAlertInput {
  params?: Omit<AlertParams, 'type'>;
  note?: string | null;
  status?: Extract<AlertStatus, 'active' | 'paused'>;
  rearm?: boolean;
  cooldownMinutes?: number;
}

/** User-facing edit. Re-activating (or editing params of) an alert resets
 * the re-arm gate so a previously-triggered alert starts clean. */
export async function updateAlert(
  userId: string,
  id: string,
  input: UpdateAlertInput
): Promise<Alert | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const set: Partial<AlertDocument> = { updatedAt: new Date() };
  if (input.params !== undefined) set.params = input.params;
  if (input.note !== undefined) set.note = input.note?.trim() || null;
  if (input.rearm !== undefined) set.rearm = input.rearm;
  if (input.cooldownMinutes !== undefined) set.cooldownMinutes = input.cooldownMinutes;
  if (input.status !== undefined || input.params !== undefined) {
    set.status = input.status ?? 'active';
    set.armed = true;
    set.cooldownUntil = null;
  }
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    { $set: set },
    { returnDocument: 'after' }
  );
  return result ? toAlert(result) : null;
}

/** Applied by the evaluation cron after each cycle (see
 * `decideAlertTransition`). Not user-facing. */
export async function applyAlertTransition(
  id: string,
  patch: Partial<
    Pick<
      Alert,
      | 'status'
      | 'armed'
      | 'cooldownUntil'
      | 'triggeredAt'
      | 'lastEvaluatedAt'
      | 'lastObservedValue'
      | 'updatedAt'
    >
  >
): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const col = await collection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: patch });
}

export async function deleteAlert(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await collection();
  const result = await col.deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount > 0;
}
