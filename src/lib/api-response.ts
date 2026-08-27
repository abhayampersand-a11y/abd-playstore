import 'server-only';

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AppError, toAppError } from './errors';

/** Uniform success envelope. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

/**
 * Uniform failure envelope. Every route funnels through here so the client only
 * ever has to understand one error shape, and so raw stack traces never leak.
 */
export function fail(error: unknown): NextResponse {
  const appError = normalize(error);

  // Server-side visibility without leaking internals to the client.
  if (appError.status >= 500) {
    console.error(`[appscout] ${appError.code}: ${appError.message}`, appError.cause ?? '');
  }

  return NextResponse.json(appError.toBody(), { status: appError.status });
}

function normalize(error: unknown): AppError {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return new AppError(
      'INVALID_INPUT',
      issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'Invalid request body.',
    );
  }
  return toAppError(error);
}

/** Parse a JSON body, turning a malformed payload into a clean 400. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError('INVALID_INPUT', 'Request body must be valid JSON.');
  }
}
