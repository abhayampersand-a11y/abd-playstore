import 'server-only';

import type { z } from 'zod';

import { AppError } from '../../errors';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import type { LlmProvider, ProviderId, StructuredCallOptions, StructuredResult } from './types';

export { mergeUsage } from './shared';
export type { Effort, LlmProvider, ProviderId, StructuredCallOptions, StructuredResult } from './types';

const PROVIDERS: Record<ProviderId, LlmProvider> = {
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

/**
 * Which provider runs the AI stages.
 *
 * `AI_PROVIDER` wins when set. Otherwise whichever key is present decides, with
 * Gemini first - it is the free one, so a server that has both keys should not
 * quietly start spending money. Nothing configured resolves to Gemini too, so
 * the Settings page and the error hints point at the option that costs nothing.
 */
export function getProvider(): LlmProvider {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === 'gemini' || explicit === 'anthropic') return PROVIDERS[explicit];

  if (geminiProvider.isConfigured()) return geminiProvider;
  if (anthropicProvider.isConfigured()) return anthropicProvider;
  return geminiProvider;
}

/** Whether the selected provider can actually be called. */
export function isProviderConfigured(): boolean {
  return getProvider().isConfigured();
}

/**
 * The single entry point every AI stage goes through.
 *
 * The pipeline never names a provider - it states what it needs and this
 * dispatches. Swapping providers is an environment change, not a code change.
 */
export function structuredCall<T extends z.ZodTypeAny>(
  options: StructuredCallOptions<T>,
): Promise<StructuredResult<z.infer<T>>> {
  const provider = getProvider();

  if (!provider.isConfigured()) {
    throw new AppError('MISSING_API_KEY', `No API key is configured for ${provider.label}.`, {
      hint:
        provider.id === 'gemini'
          ? 'Get a free key at aistudio.google.com/apikey, put it in .env.local as GEMINI_API_KEY and restart the server.'
          : 'Add CLAUDE_API_KEY to .env.local and restart the server.',
    });
  }

  return provider.structuredCall(options);
}
