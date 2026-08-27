import 'server-only';

import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';

import { AppError, toAppError } from '../../errors';
import { serverConfig } from '../../server-env';
import type { TokenUsage } from '../../types';
import { parseStructured } from './shared';
import type { Effort, LlmProvider, StructuredCallOptions, StructuredResult } from './types';

/**
 * Google Gemini adapter - the free-tier default.
 *
 * Gemini has no equivalent of Anthropic's explicit `cache_control`, so the
 * system prompt is sent in full each time and we lean on Gemini's own implicit
 * caching. That is the main behavioural difference from the Anthropic adapter;
 * everything the pipeline sees is the same, schema enforcement included.
 */

let cached: GoogleGenAI | null = null;

function getApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

function getClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AppError('MISSING_API_KEY', 'GEMINI_API_KEY is not configured on the server.', {
      hint: 'Get a free key at aistudio.google.com/apikey, add it to .env.local and restart the server.',
    });
  }
  if (!cached) cached = new GoogleGenAI({ apiKey });
  return cached;
}

/**
 * Map the app's five effort levels onto Gemini's four thinking levels.
 *
 * `xhigh` and `max` both land on HIGH because that is the deepest Gemini
 * offers - the pipeline still gets the strongest setting available rather than
 * an error, which is the behaviour that matters when swapping providers.
 */
const THINKING_LEVEL: Record<Effort, ThinkingLevel> = {
  low: ThinkingLevel.MINIMAL,
  medium: ThinkingLevel.LOW,
  high: ThinkingLevel.MEDIUM,
  xhigh: ThinkingLevel.HIGH,
  max: ThinkingLevel.HIGH,
};

/**
 * The stage's zod schema, as JSON Schema for Gemini to enforce.
 *
 * This is not optional decoration. The system prompts instruct the model to
 * "return one JSON object matching the requested schema exactly" - on Anthropic
 * that schema travels with the request via `zodOutputFormat`, and without an
 * equivalent here the model is being asked to match a schema it was never
 * shown. `responseMimeType: 'application/json'` alone guarantees only that the
 * reply parses, not that it has the right fields.
 *
 * `$refStrategy: 'none'` inlines every definition, because Gemini does not
 * resolve `$ref`. The `.describe()` text on each field is carried through and
 * does real work - it is how "3-6 evidence-backed reasons" reaches the model.
 */
const schemaCache = new WeakMap<z.ZodTypeAny, unknown>();

function toResponseSchema(schema: z.ZodTypeAny): unknown | undefined {
  const cached = schemaCache.get(schema);
  if (cached) return cached;

  try {
    const converted = zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' });
    schemaCache.set(schema, converted);
    return converted;
  } catch {
    // Degrade to prompt-enforced JSON rather than failing the request. The
    // reply is zod-validated either way, so the worst case is the error the
    // schema was meant to prevent - not a broken call.
    return undefined;
  }
}

function usageFrom(response: GenerateContentResponse): TokenUsage {
  const usage = response.usageMetadata;
  return {
    inputTokens: usage?.promptTokenCount ?? 0,
    // Thinking tokens are billed and metered as output, so count them as such -
    // otherwise the usage shown in the workspace understates every run.
    outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    calls: 1,
  };
}

/** Turn a non-STOP finish into the app's error taxonomy. */
function assertFinishedCleanly(response: GenerateContentResponse): void {
  const reason = response.candidates?.[0]?.finishReason;
  if (!reason || reason === 'STOP') return;

  if (reason === 'MAX_TOKENS') {
    throw new AppError('MODEL_INVALID_JSON', 'The model ran out of output space before finishing.', {
      hint: 'Reduce the number of competitors analysed, then retry.',
    });
  }
  if (reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT' || reason === 'BLOCKLIST') {
    throw new AppError('MODEL_REFUSAL', 'Gemini declined to analyse this request.', {
      hint: 'Rephrase the app idea in more neutral terms and try again.',
    });
  }
  if (reason === 'RECITATION') {
    throw new AppError('MODEL_REFUSAL', 'Gemini stopped to avoid reproducing copyrighted text.', {
      hint: 'Retry - this usually clears on a second run.',
    });
  }
  throw new AppError('MODEL_ERROR', `Gemini stopped unexpectedly (${reason}).`);
}

/** Map SDK exceptions onto the app's error taxonomy. */
export function mapGeminiError(error: unknown): AppError {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return new AppError('MISSING_API_KEY', 'The Gemini API key was rejected.', {
        hint: 'Check GEMINI_API_KEY in .env.local - it may be revoked or restricted to another project.',
        cause: error,
      });
    }
    if (error.status === 429) {
      return new AppError('RATE_LIMITED', 'Gemini is rate limiting this key.', {
        hint: 'The free tier has a daily and per-minute cap. Wait a moment, or lower the number of competitors analysed.',
        cause: error,
      });
    }
    if (error.status === 503) {
      return new AppError('MODEL_ERROR', 'Gemini is overloaded right now.', {
        hint: 'This model is in high demand. Wait a moment and retry, or set GEMINI_MODEL to a less busy model.',
        retryable: true,
        cause: error,
      });
    }
    if (error.status === 400) {
      return new AppError('MODEL_ERROR', `Gemini rejected the request: ${error.message}`, { cause: error });
    }
    return new AppError('MODEL_ERROR', `Gemini API error ${error.status}: ${error.message}`, { cause: error });
  }
  return toAppError(error);
}

/**
 * Retry a request that Gemini declined because the model was overloaded.
 *
 * A 503 here means "this model is busy right now", not "this request is wrong"
 * - popular models return it in bursts, and the same call succeeds moments
 * later. A research run is long and expensive to restart, so absorbing that is
 * worth a few seconds. Every other status, including the 429 rate limit, is
 * reported immediately: those need the caller to change something.
 */
const OVERLOAD_DELAYS_MS = [1000, 3000, 6000];

async function withOverloadRetry(
  operation: () => Promise<GenerateContentResponse>,
): Promise<GenerateContentResponse> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const overloaded = error instanceof ApiError && error.status === 503;
      if (overloaded && attempt < OVERLOAD_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, OVERLOAD_DELAYS_MS[attempt]));
        continue;
      }
      throw mapGeminiError(error);
    }
  }
}

export const geminiProvider: LlmProvider = {
  id: 'gemini',
  label: 'Google Gemini',

  get model(): string {
    return serverConfig.geminiModel;
  },

  isConfigured(): boolean {
    return getApiKey() !== undefined;
  },

  async structuredCall<T extends z.ZodTypeAny>(
    options: StructuredCallOptions<T>,
  ): Promise<StructuredResult<z.infer<T>>> {
    const client = getClient();

    const responseJsonSchema = toResponseSchema(options.schema);

    const response = await withOverloadRetry(() =>
      client.models.generateContent({
        model: serverConfig.geminiModel,
        contents: options.userContent,
        config: {
          systemInstruction: options.system,
          responseMimeType: 'application/json',
          // Constrains the *shape*; the mime type above only constrains syntax.
          ...(responseJsonSchema ? { responseJsonSchema } : {}),
          maxOutputTokens: options.maxTokens ?? 32_000,
          thinkingConfig: {
            thinkingLevel: THINKING_LEVEL[options.effort ?? serverConfig.effort],
          },
        },
      }),
    );

    assertFinishedCleanly(response);

    return {
      data: parseStructured(options.schema, response.text ?? ''),
      usage: usageFrom(response),
    };
  },
};
