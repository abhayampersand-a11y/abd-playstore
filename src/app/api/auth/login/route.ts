import { fail, ok, readJson } from '@/lib/api-response';
import { isAuthConfigured, verifyCredentials } from '@/lib/auth/credentials';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, sessionCookieOptions } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { loginSchema } from '@/lib/validation';

/**
 * POST /api/auth/login
 *
 * Exchanges the environment-configured credentials for a signed session cookie.
 * Reachable while signed out - see the public list in `src/middleware.ts`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Failed-attempt throttle, keyed by client address.
 *
 * In-memory and therefore per-instance, which is the right trade for a
 * single-account tool: it defeats an online password-guessing loop without
 * dragging in a store. It is not a defence against a distributed attacker -
 * a long password is.
 */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

function throttleKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

function assertNotThrottled(key: string): void {
  const record = attempts.get(key);
  if (!record) return;
  if (Date.now() - record.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return;
  }
  if (record.count >= MAX_ATTEMPTS) {
    throw new AppError('RATE_LIMITED', 'Too many failed sign-in attempts.', {
      hint: 'Wait ten minutes before trying again.',
    });
  }
}

function recordFailure(key: string): void {
  const record = attempts.get(key);
  if (!record || Date.now() - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  record.count += 1;
}

export async function POST(request: Request) {
  try {
    if (!isAuthConfigured()) {
      throw new AppError('UNAUTHORIZED', 'Sign-in is not configured on this server.', {
        hint: 'Set AUTH_USERNAME and AUTH_PASSWORD in .env.local, then restart the server.',
        status: 503,
      });
    }

    const key = throttleKey(request);
    assertNotThrottled(key);

    const { username, password } = loginSchema.parse(await readJson(request));

    if (!(await verifyCredentials(username, password))) {
      recordFailure(key);
      // One message for both failure modes: never confirm that a username exists.
      throw new AppError('UNAUTHORIZED', 'Incorrect username or password.', {
        hint: 'Check the values set in AUTH_USERNAME and AUTH_PASSWORD.',
      });
    }

    const token = await createSessionToken(username.trim());
    if (!token) {
      throw new AppError('UNKNOWN', 'Could not create a session.', {
        hint: 'Set AUTH_SECRET in .env.local and restart the server.',
      });
    }

    attempts.delete(key);

    const response = ok({ username: username.trim() });
    response.cookies.set(SESSION_COOKIE, token, {
      ...sessionCookieOptions(new URL(request.url).protocol === 'https:'),
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return fail(error);
  }
}
