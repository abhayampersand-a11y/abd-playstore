import 'server-only';

import type { z } from 'zod';

import type { TokenUsage } from '../../types';

/**
 * The provider contract.
 *
 * Every AI stage in the app is the same shape of call: a fixed system prompt, a
 * request-specific user message, and a zod schema the answer must satisfy. That
 * is narrow enough to sit behind one interface, which is what lets the app run
 * on a free provider or a paid one without the pipeline knowing the difference.
 */

export type ProviderId = 'gemini' | 'anthropic';

export interface StructuredResult<T> {
  data: T;
  usage: TokenUsage;
}

export interface StructuredCallOptions<T extends z.ZodTypeAny> {
  schema: T;
  system: string;
  userContent: string;
  /** Falls back to the provider's configured default when omitted. */
  maxTokens?: number;
  effort?: Effort;
}

/**
 * Reasoning depth, expressed in the app's own vocabulary.
 *
 * Each provider maps these onto whatever it actually supports - Anthropic takes
 * them almost directly, Gemini collapses them onto four thinking levels. The
 * pipeline says what it wants and the adapter decides how to ask for it.
 */
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface LlmProvider {
  readonly id: ProviderId;
  /** Human-facing name, shown on the Settings page. */
  readonly label: string;
  /** The model this provider will actually call. */
  readonly model: string;
  /** Whether the server has the credentials this provider needs. */
  isConfigured(): boolean;
  /**
   * One structured call: request, refusal check, JSON extraction, schema
   * validation. Anything returned from here is a fully-typed value.
   */
  structuredCall<T extends z.ZodTypeAny>(
    options: StructuredCallOptions<T>,
  ): Promise<StructuredResult<z.infer<T>>>;
}
