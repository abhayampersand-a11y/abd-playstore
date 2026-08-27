import 'server-only';

import { cookies } from 'next/headers';

import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from './session';

/**
 * Read the signed session in a Server Component or Route Handler.
 *
 * Middleware already rejects unauthenticated requests, so this exists to *name*
 * the signed-in user in the UI rather than to guard anything.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
