import { generateText } from 'ai';
import { resolveModel, type AiConfig } from './providers';

export interface GenerateResult {
  ok: true;
  text: string;
  model: string;
}

export interface GenerateError {
  ok: false;
  error: string;
}

/**
 * One non-streaming text generation. Never throws — provider/auth errors
 * (bad key, quota, model not found) come back as `{ ok: false, error }`
 * so route handlers can return a clean 4xx/5xx.
 */
export async function generateInsightText(
  config: AiConfig,
  system: string,
  prompt: string
): Promise<GenerateResult | GenerateError> {
  try {
    const model = resolveModel(config);
    const { text } = await generateText({
      model,
      system,
      prompt,
      temperature: 0.4,
      maxOutputTokens: 700,
    });
    const clean = text.trim();
    if (!clean) return { ok: false, error: 'The model returned an empty response.' };
    return { ok: true, text: clean, model: config.model?.trim() || `${config.provider} (default)` };
  } catch (err) {
    return { ok: false, error: normalizeAiError(err) };
  }
}

/** A cheap round-trip to check a key works, for "Test & save". */
export async function validateAiKey(config: AiConfig): Promise<GenerateError | { ok: true }> {
  const res = await generateInsightText(
    config,
    'Reply with the single word OK.',
    'Say OK.'
  );
  return res.ok ? { ok: true } : res;
}

export function normalizeAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/api[_ ]?key|unauthor|401|permission|invalid.*credential/i.test(msg)) {
    return 'That API key was rejected by the provider. Check the key and the selected provider.';
  }
  if (/quota|rate.?limit|429|resource.?exhausted/i.test(msg)) {
    return 'The provider returned a rate-limit / quota error. Try again shortly.';
  }
  if (/model|not found|404/i.test(msg)) {
    return 'The provider could not find that model. Leave the model blank to use the default.';
  }
  return 'The AI request failed. Please try again.';
}
