import type { ApiErrorBody } from './types';

/**
 * Every failure mode the product can hit, as a closed set. The UI maps these
 * codes to illustrations and recovery actions, so adding a code here is a
 * deliberate act rather than a stray string.
 */
export type AppErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'DATABASE_ERROR'
  | 'MISSING_API_KEY'
  | 'SCRAPER_UNAVAILABLE'
  | 'NO_APPS_FOUND'
  | 'NO_REVIEWS_FOUND'
  | 'PLAY_STORE_ERROR'
  | 'MODEL_ERROR'
  | 'MODEL_INVALID_JSON'
  | 'MODEL_REFUSAL'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'NOT_FOUND'
  | 'UNKNOWN';

interface AppErrorOptions {
  hint?: string;
  retryable?: boolean;
  status?: number;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly hint?: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.hint = options.hint;
    this.retryable = options.retryable ?? DEFAULT_RETRYABLE.has(code);
    this.status = options.status ?? DEFAULT_STATUS[code];
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        hint: this.hint,
        retryable: this.retryable,
      },
    };
  }
}

const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  DATABASE_ERROR: 503,
  MISSING_API_KEY: 503,
  SCRAPER_UNAVAILABLE: 503,
  NO_APPS_FOUND: 404,
  NO_REVIEWS_FOUND: 404,
  PLAY_STORE_ERROR: 502,
  MODEL_ERROR: 502,
  MODEL_INVALID_JSON: 502,
  MODEL_REFUSAL: 422,
  RATE_LIMITED: 429,
  NETWORK_ERROR: 503,
  TIMEOUT: 504,
  NOT_FOUND: 404,
  UNKNOWN: 500,
};

const DEFAULT_RETRYABLE = new Set<AppErrorCode>([
  'DATABASE_ERROR',
  'PLAY_STORE_ERROR',
  'MODEL_ERROR',
  'MODEL_INVALID_JSON',
  'RATE_LIMITED',
  'NETWORK_ERROR',
  'TIMEOUT',
]);

/** Human-facing copy for each code. Used by both API routes and error screens. */
export const ERROR_COPY: Record<AppErrorCode, { title: string; hint: string }> = {
  INVALID_INPUT: {
    title: 'That research request is not valid',
    hint: 'Check the keyword, country and language, then try again.',
  },
  DATABASE_ERROR: {
    title: 'The database could not be reached',
    hint: 'Check DATABASE_URL in .env and that the Neon project is still running, then retry.',
  },
  UNAUTHORIZED: {
    title: 'You are not signed in',
    hint: 'Your session has expired. Reload the page and sign in again.',
  },
  MISSING_API_KEY: {
    title: 'No AI provider key is configured',
    hint: 'Add GEMINI_API_KEY (free) or CLAUDE_API_KEY to .env.local and restart the server. Scraping still works without one.',
  },
  SCRAPER_UNAVAILABLE: {
    title: 'The Google Play scraper could not be loaded',
    hint: 'Run `npm install` to make sure google-play-scraper is present.',
  },
  NO_APPS_FOUND: {
    title: 'No apps matched that search',
    hint: 'Try a broader keyword, or switch to a larger country such as United States.',
  },
  NO_REVIEWS_FOUND: {
    title: 'No reviews could be collected',
    hint: 'These apps have few written reviews in this language. Try a different language or a more popular keyword.',
  },
  PLAY_STORE_ERROR: {
    title: 'Google Play did not respond correctly',
    hint: 'Play throttles bursts of requests. Wait a minute and run the research again.',
  },
  MODEL_ERROR: {
    title: 'The AI request failed',
    hint: 'Check the API key configured for your provider, then retry.',
  },
  MODEL_INVALID_JSON: {
    title: 'The model returned a malformed analysis',
    hint: 'This is usually transient. Retry the analysis.',
  },
  MODEL_REFUSAL: {
    title: 'The model declined to analyse this request',
    hint: 'Rephrase the app idea and try again.',
  },
  RATE_LIMITED: {
    title: 'Rate limit reached',
    hint: 'Too many requests in a short window. Wait a moment and retry.',
  },
  NETWORK_ERROR: {
    title: 'Network request failed',
    hint: 'Check your internet connection and try again.',
  },
  TIMEOUT: {
    title: 'The request took too long',
    hint: 'Reduce the number of competitors or reviews and run it again.',
  },
  NOT_FOUND: {
    title: 'Not found',
    hint: 'The research you are looking for is no longer available on this device.',
  },
  UNKNOWN: {
    title: 'Something went wrong',
    hint: 'An unexpected error occurred. Try again in a moment.',
  },
};

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Narrow an arbitrary thrown value into an AppError with sensible defaults. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof Error) {
    const message = error.message || 'Unexpected error';
    const lowered = message.toLowerCase();

    if (error.name === 'AbortError' || lowered.includes('timeout') || lowered.includes('etimedout')) {
      return new AppError('TIMEOUT', 'The upstream request timed out.', { cause: error });
    }
    if (
      lowered.includes('enotfound') ||
      lowered.includes('econnrefused') ||
      lowered.includes('econnreset') ||
      lowered.includes('fetch failed') ||
      lowered.includes('network')
    ) {
      return new AppError('NETWORK_ERROR', 'Could not reach the upstream service.', { cause: error });
    }
    return new AppError('UNKNOWN', message, { cause: error });
  }

  return new AppError('UNKNOWN', 'Unexpected error', { cause: error });
}

/** Shape an AppError body from a fetch response body, for client-side use. */
export function parseApiError(status: number, body: unknown): AppError {
  const candidate = body as Partial<ApiErrorBody> | null | undefined;
  const detail = candidate?.error;
  if (detail?.code) {
    return new AppError(detail.code as AppErrorCode, detail.message, {
      hint: detail.hint,
      retryable: detail.retryable,
      status,
    });
  }
  if (status === 429) {
    return new AppError('RATE_LIMITED', ERROR_COPY.RATE_LIMITED.title, { status });
  }
  return new AppError('UNKNOWN', `Request failed with status ${status}`, { status });
}
