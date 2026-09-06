import { getDb } from '@/lib/mongodb';
import { decrypt, encrypt } from '@/lib/crypto';

export type AiProvider = 'gemini' | 'anthropic' | 'openrouter';

export interface AiSettings {
  provider: AiProvider;
  /** Decrypted — only ever returned server-side. */
  apiKey: string;
  model: string | null;
  updatedAt: Date;
}

/** What the settings page shows — never the key itself. */
export interface AiSettingsView {
  provider: AiProvider;
  model: string | null;
  /** Last 4 chars, for "…, ends ••••ab12". */
  keyHint: string;
  updatedAt: Date;
}

interface UserSettingsDoc {
  userId: string;
  aiProvider: AiProvider;
  aiKeyEnc: string;
  aiModel: string | null;
  updatedAt: Date;
}

async function collection() {
  const db = await getDb();
  return db.collection<UserSettingsDoc>('userSettings');
}

export async function getAiSettings(userId: string): Promise<AiSettings | null> {
  const doc = await (await collection()).findOne({ userId });
  if (!doc) return null;
  return {
    provider: doc.aiProvider,
    apiKey: decrypt(doc.aiKeyEnc),
    model: doc.aiModel,
    updatedAt: doc.updatedAt,
  };
}

export async function getAiSettingsView(userId: string): Promise<AiSettingsView | null> {
  const s = await getAiSettings(userId);
  if (!s) return null;
  return {
    provider: s.provider,
    model: s.model,
    keyHint: s.apiKey.slice(-4),
    updatedAt: s.updatedAt,
  };
}

export async function setAiSettings(
  userId: string,
  input: { provider: AiProvider; apiKey: string; model?: string | null }
): Promise<void> {
  const now = new Date();
  await (await collection()).updateOne(
    { userId },
    {
      $set: {
        aiProvider: input.provider,
        aiKeyEnc: encrypt(input.apiKey),
        aiModel: input.model?.trim() || null,
        updatedAt: now,
      },
      $setOnInsert: { userId },
    },
    { upsert: true }
  );
}

export async function clearAiSettings(userId: string): Promise<void> {
  await (await collection()).deleteOne({ userId });
}
