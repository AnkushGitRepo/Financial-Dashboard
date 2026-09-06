import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import type { AiProvider } from '@/lib/userSettings';

// Defaults used when the user leaves the model field blank. Google
// retired `gemini-2.5-flash` for new keys (404 "no longer available to
// new users", pointing at 3.6-flash), so track their current flash tier.
export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-3.6-flash',
  anthropic: 'claude-haiku-4-5',
  openrouter: 'google/gemini-3.6-flash',
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  anthropic: 'Anthropic Claude',
  openrouter: 'OpenRouter',
};

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string | null;
}

/** Build a LanguageModel from a resolved BYO config. */
export function resolveModel(config: AiConfig): LanguageModel {
  const model = config.model?.trim() || DEFAULT_MODELS[config.provider];
  switch (config.provider) {
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey: config.apiKey })(model);
    case 'anthropic':
      return createAnthropic({ apiKey: config.apiKey })(model);
    case 'openrouter':
      return createOpenRouter({ apiKey: config.apiKey })(model);
  }
}
