// The `agentRuns` collection (Phase 11 / ADR 0021). The doc IS the
// checkpoint — the tick worker advances one phase per invocation and
// persists, so a fresh invocation resumes from `phase`.

import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type {
  AnalystReport,
  DebateTurn,
  KeyClaim,
  Reflection,
  RunPhase,
  RunStatus,
} from './types';

export interface AgentRunDoc {
  _id: ObjectId;
  userId: string;
  symbol: string;
  companyName: string | null;
  status: RunStatus;
  phase: RunPhase;
  priceAtRun: number | null;
  analystReports: AnalystReport[];
  debateTurns: DebateTurn[];
  debateRoundsDone: number;
  briefing: string | null;
  briefingRegenerated: boolean;
  keyClaims: KeyClaim[];
  reflection: Reflection | null;
  model: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Advisory lock so two ticks don't process one run at once. */
  lockedAt: Date | null;
}

/** What the poll endpoint / UI sees. */
export interface AgentRunView {
  id: string;
  symbol: string;
  companyName: string | null;
  status: RunStatus;
  phase: RunPhase;
  debateRoundsDone: number;
  briefing: string | null;
  briefingRegenerated: boolean;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const STALE_LOCK_MS = 3 * 60 * 1000;
export const ACTIVE_STATUSES: RunStatus[] = ['queued', 'running'];

async function collection() {
  const db = await getDb();
  return db.collection<AgentRunDoc>('agentRuns');
}

export function toView(doc: AgentRunDoc): AgentRunView {
  return {
    id: doc._id.toString(),
    symbol: doc.symbol,
    companyName: doc.companyName,
    status: doc.status,
    phase: doc.phase,
    debateRoundsDone: doc.debateRoundsDone,
    briefing: doc.briefing,
    briefingRegenerated: doc.briefingRegenerated,
    error: doc.error,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function userHasActiveRun(userId: string): Promise<boolean> {
  const col = await collection();
  return (await col.countDocuments({ userId, status: { $in: ACTIVE_STATUSES } })) > 0;
}

export async function createRun(input: {
  userId: string;
  symbol: string;
  companyName: string | null;
  priceAtRun: number | null;
}): Promise<string> {
  const col = await collection();
  const now = new Date();
  const doc: AgentRunDoc = {
    _id: new ObjectId(),
    userId: input.userId,
    symbol: input.symbol,
    companyName: input.companyName,
    status: 'queued',
    phase: 'analysts',
    priceAtRun: input.priceAtRun,
    analystReports: [],
    debateTurns: [],
    debateRoundsDone: 0,
    briefing: null,
    briefingRegenerated: false,
    keyClaims: [],
    reflection: null,
    model: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    lockedAt: null,
  };
  await col.insertOne(doc);
  return doc._id.toString();
}

export async function getRunForUser(userId: string, id: string): Promise<AgentRunDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  return col.findOne({ _id: new ObjectId(id), userId });
}

export async function getRunById(id: string): Promise<AgentRunDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  return col.findOne({ _id: new ObjectId(id) });
}

/** Atomically claim the oldest resumable run (unlocked or stale-locked),
 *  marking it `running` + locked. Returns null when there's nothing to do. */
export async function claimNextRun(id?: string): Promise<AgentRunDoc | null> {
  const col = await collection();
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  const filter: Record<string, unknown> = {
    status: { $in: ACTIVE_STATUSES },
    $or: [{ lockedAt: null }, { lockedAt: { $lt: staleBefore } }],
  };
  if (id && ObjectId.isValid(id)) filter._id = new ObjectId(id);

  return col.findOneAndUpdate(
    filter,
    { $set: { status: 'running', lockedAt: new Date(), updatedAt: new Date() } },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
  );
}

export async function patchRun(
  id: string,
  fields: Partial<Omit<AgentRunDoc, '_id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...fields, updatedAt: new Date() } }
  );
}

export async function releaseRun(id: string): Promise<void> {
  await patchRun(id, { lockedAt: null });
}

export async function ensureAgentRunsIndexes(): Promise<void> {
  const col = await collection();
  await col.createIndexes([
    { key: { userId: 1, status: 1 }, name: 'user_status' },
    { key: { status: 1, lockedAt: 1, createdAt: 1 }, name: 'claimable' },
    { key: { createdAt: 1 }, name: 'created' },
  ]);
}

/** For Part C's reflection sweep. */
export type { Reflection };
export { ObjectId };
