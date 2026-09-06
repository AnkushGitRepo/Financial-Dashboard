import { getAiSettings, type AiProvider } from '@/lib/userSettings';
import { isHosted } from '@/lib/deployment-mode';
import type { AiConfig } from './providers';

/**
 * Resolve the AI config to use for a request (ADR 0018 §2):
 *   1. the user's stored, encrypted BYO key
 *   2. deployment env — `AI_PROVIDER` + `AI_API_KEY` (+ optional `AI_MODEL`)
 *      — the self-host path, and the operator's key for shared IPO briefs
 *   3. null → the UI prompts "Add your AI key"
 *
 * `allowEnv: false` skips step 2 — used for per-user insights (stock,
 * portfolio, chat), which must always be the user's own key.
 */
export async function getAiConfig(
  userId: string | null,
  opts: { allowEnv?: boolean } = {}
): Promise<AiConfig | null> {
  if (userId) {
    const stored = await getAiSettings(userId).catch(() => null);
    if (stored) {
      return { provider: stored.provider, apiKey: stored.apiKey, model: stored.model };
    }
  }

  if (opts.allowEnv !== false) {
    const provider = process.env.AI_PROVIDER as AiProvider | undefined;
    const apiKey = process.env.AI_API_KEY;
    if (provider && apiKey && ['gemini', 'anthropic', 'openrouter'].includes(provider)) {
      return { provider, apiKey, model: process.env.AI_MODEL || null };
    }
  }

  return null;
}

/**
 * Config for a *per-user* AI surface (stock read, portfolio insight, Mitra
 * chat). Uses the caller's own stored key, and the deployment
 * `AI_PROVIDER`/`AI_API_KEY` env key **only in self-host** — where there is
 * a single local user, so "the deployment key" and "the user's key" are the
 * same thing. In hosted mode a per-user surface never falls back to the
 * operator's key (ADR 0018 §2/§5) — only shared IPO briefs may.
 */
export function getUserAiConfig(userId: string | null): Promise<AiConfig | null> {
  return getAiConfig(userId, { allowEnv: !isHosted() });
}
