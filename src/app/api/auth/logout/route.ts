import { fail, ok } from '@/lib/api-response';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Public by necessity - an expired or malformed
 * cookie must still be clearable, and there is nothing here worth guarding.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const response = ok({ signedOut: true });
    response.cookies.set(SESSION_COOKIE, '', {
      ...sessionCookieOptions(new URL(request.url).protocol === 'https:'),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return fail(error);
  }
}
