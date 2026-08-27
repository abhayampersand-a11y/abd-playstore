import { NextResponse, type NextRequest } from 'next/server';

import { isAuthEnforced } from '@/lib/auth/credentials';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

/**
 * The gate. Every request for a page or an API route passes through here, so
 * adding a new route cannot accidentally create an unauthenticated entry point.
 *
 * Runs on the edge runtime, which is why the session module is built on Web
 * Crypto rather than `node:crypto`.
 */

const LOGIN_PATH = '/login';

/** Routes that must stay reachable while signed out, or nobody could sign in. */
const PUBLIC_PATHS = new Set([LOGIN_PATH, '/api/auth/login', '/api/auth/logout']);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLIC_PATHS.has(pathname)) {
    // Nothing to do on the login screen once you already hold a session.
    if (pathname === LOGIN_PATH && session) {
      return NextResponse.redirect(new URL(redirectTargetFrom(request), request.url));
    }
    return NextResponse.next();
  }

  if (session || !isAuthEnforced()) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sign in to use AppScout.',
          hint: 'Your session has expired. Reload the page and sign in again.',
          retryable: false,
        },
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  // Carry the requested page so signing in lands where the user was headed.
  if (pathname !== '/') loginUrl.searchParams.set('from', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

/** Where an already-signed-in visitor to /login should be sent. */
function redirectTargetFrom(request: NextRequest): string {
  const from = request.nextUrl.searchParams.get('from');
  // Only same-origin, absolute-path targets - never an attacker-supplied host.
  return from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

export const config = {
  /**
   * Everything except Next's own static output and the favicon. Matching API
   * routes as well is the point: the scraping and AI endpoints are the
   * expensive surface, and they are useless to protect at the page level only.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
