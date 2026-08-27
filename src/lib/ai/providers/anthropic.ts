import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

import { AppError, toAppError } from '../../errors';
import { serverConfig } from '../../server-env';
import type { TokenUsage } from '../../types';
import { parseStructured } from './shared';
import type { LlmProvider, StructuredCallOptions, StructuredResult } from './types';

/**
 * Anthropic adapter - the paid option, kept because it produces the best
 * analyses. Selected by setting CLAUDE_API_KEY (see `providers/index.ts`).
 */

let cached: Anthropic | null = null;

function getApiKey(): string | undefined {
  const key = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

function getClient(): Anthropic {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AppError('MISSING_API_KEY', 'CLAUDE_API_KEY is not configured on the server.', {
      hint: 'Add CLAUDE_API_KEY to .env.local and restart the server.',
    });
  }
  if (!cached) {
    cached = new Anthropic({ apiKey, maxRetries: 2, timeout: 10 * 60 * 1000 });
  }
  return cached;
}

/**
 * Build the structured-output format descriptor.
 *
 * `zodOutputFormat` is the supported path, but it is loaded defensively: if the
 * installed SDK/zod pairing cannot produce a format, we fall back to
 * prompt-enforced JSON. The prompt always states the JSON contract anyway, and
 * the response is validated with the same zod schema either way, so the
 * fallback degrades cleanly instead of failing the request.
 */
async function buildOutputFormat(schema: z.ZodTypeAny, name: string): Promise<unknown | undefined> {
  try {
    const helpers = await import('@anthropic-ai/sdk/helpers/zod');
    const zodOutputFormat = (helpers as { zodOutputFormat?: (s: unknown, n?: string) => unknown })
      .zodOutputFormat;
    if (typeof zodOutputFormat !== 'function') return undefined;
    return zodOutputFormat(schema, name);
  } catch {
    return undefined;
  }
}

function collectText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function usageFrom(message: Anthropic.Message): TokenUsage {
  return {
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
    calls: 1,
  };
}

function assertNotRefused(message: Anthropic.Message): void {
  if (message.stop_reason === 'refusal') {
    // `stop_details` is only populated on a refusal, and only on models that
    // report it - read it structurally so the code compiles against SDK
    // versions that predate the field.
    const detail = (message as { stop_details?: { explanation?: string } | null }).stop_details;
    throw new AppError(
      'MODEL_REFUSAL',
      detail?.explanation || 'Claude declined to analyse this request.',
      { hint: 'Rephrase the app idea in more neutral terms and try again.' },
    );
  }
  if (message.stop_reason === 'max_tokens') {
    throw new AppError('MODEL_INVALID_JSON', 'Claude ran out of output space before finishing.', {
      hint: 'Reduce the number of competitors analysed, then retry.',
    });
  }
}

/** Map SDK exceptions onto the app's error taxonomy. */
export function mapClaudeError(error: unknown): AppError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AppError('MISSING_API_KEY', 'The Claude API key was rejected.', {
      hint: 'Check CLAUDE_API_KEY in .env.local - it may be revoked or from the wrong workspace.',
      cause: error,
    });
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AppError('RATE_LIMITED', 'Claude is rate limiting this API key.', {
      hint: 'Wait a moment and retry, or lower the number of competitors analysed.',
      cause: error,
    });
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new AppError('MODEL_ERROR', `Claude rejected the request: ${error.message}`, { cause: error });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AppError('NETWORK_ERROR', 'Could not reach the Claude API.', {
      hint: 'Check the network connection on the server and try again.',
      cause: error,
    });
  }
  if (error instanceof Anthropic.APIError) {
    return new AppError('MODEL_ERROR', `Claude API error ${error.status ?? ''}: ${error.message}`.trim(), {
      cause: error,
    });
  }
  return toAppError(error);
}

export const anthropicProvider: LlmProvider = {
  id: 'anthropic',
  label: 'Anthropic Claude',

  get model(): string {
    return serverConfig.claudeModel;
  },

  isConfigured(): boolean {
    return getApiKey() !== undefined;
  },

  async structuredCall<T extends z.ZodTypeAny>(
    options: StructuredCallOptions<T>,
  ): Promise<StructuredResult<z.infer<T>>> {
    const client = getClient();
    const format = await buildOutputFormat(options.schema, 'result');

    // Built as a plain object and widened at the call site: `output_config` and
    // `thinking: adaptive` are newer request fields, and pinning them to a named
    // SDK param type would break the build on any SDK version that spells them
    // differently. The runtime shape is what the API contract specifies.
    type StreamParams = Parameters<typeof client.messages.stream>[0];
    const request: Record<string, unknown> = {
      model: serverConfig.claudeModel,
      max_tokens: options.maxTokens ?? 32_000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: options.effort ?? serverConfig.effort,
        ...(format ? { format } : {}),
      },
      // The system prompt is byte-identical across every research run, so it
      // caches cleanly and makes repeat analyses meaningfully cheaper. Anything
      // request-specific goes in the user message, never here.
      system: [{ type: 'text', text: options.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: options.userContent }],
    };

    let message: Anthropic.Message;
    try {
      // Streaming keeps a large max_tokens from tripping the HTTP timeout.
      const stream = client.messages.stream(request as unknown as StreamParams);
      message = await stream.finalMessage();
    } catch (error) {
      throw mapClaudeError(error);
    }

    assertNotRefused(message);

    return {
      data: parseStructured(options.schema, collectText(message.content)),
      usage: usageFrom(message),
    };
  },
};
