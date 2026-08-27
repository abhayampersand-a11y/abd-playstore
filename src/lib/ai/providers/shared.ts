import 'server-only';

import type { z } from 'zod';

import { AppError } from '../../errors';
import type { TokenUsage } from '../../types';

/**
 * Provider-neutral plumbing.
 *
 * Both adapters end up holding a string that is supposed to be JSON and a zod
 * schema it is supposed to match. Everything from that point on is identical,
 * so it lives here rather than being written twice and drifting.
 */

/**
 * Pull a JSON object out of a text response, tolerating the two things models
 * actually do wrong: wrapping it in a ``` fence, or prefacing it with prose.
 */
export function extractJson(text: string): unknown {
  const withoutFences = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFences);
  } catch {
    // Fall through to brace matching.
  }

  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new AppError('MODEL_INVALID_JSON', 'The model did not return a JSON object.');
  }

  try {
    return JSON.parse(withoutFences.slice(start, end + 1));
  } catch (cause) {
    throw new AppError('MODEL_INVALID_JSON', 'The model returned JSON that could not be parsed.', { cause });
  }
}

/** Parse and validate a raw response body against the stage's schema. */
export function parseStructured<T extends z.ZodTypeAny>(schema: T, text: string): z.infer<T> {
  if (!text.trim()) {
    throw new AppError('MODEL_INVALID_JSON', 'The model returned an empty response.');
  }

  const parsed = schema.safeParse(extractJson(text));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(
      'MODEL_INVALID_JSON',
      `The model returned a response that failed validation${issue ? `: ${issue.path.join('.')} ${issue.message}` : ''}.`,
      { hint: 'This is usually transient. Retry the analysis.' },
    );
  }

  return parsed.data;
}

export function mergeUsage(...usages: TokenUsage[]): TokenUsage {
  return usages.reduce<TokenUsage>(
    (total, usage) => ({
      inputTokens: total.inputTokens + usage.inputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
      calls: total.calls + usage.calls,
    }),
    { inputTokens: 0, outputTokens: 0, calls: 0 },
  );
}
