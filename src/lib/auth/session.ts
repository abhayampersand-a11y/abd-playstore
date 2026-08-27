/**
 * Signed session cookie.
 *
 * Deliberately dependency-free and built on Web Crypto rather than
 * `node:crypto`, because this module is imported by `src/middleware.ts`, which
 * Next runs on the edge runtime where the Node builtins are unavailable.
 *
 * The cookie is a signed *statement*, not an opaque id: there is no session
 * store to look anything up in, because there is exactly one account and it
 * lives in the environment. Tampering is caught by the HMAC; expiry is carried
 * in the payload and re-checked on every request.
 */

export const SESSION_COOKIE = 'appscout_session';

/** Sessions last a week; long enough to stay signed in, short enough to lapse. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  /** Username that was authenticated. */
  username: string;
  /** Issued-at, epoch seconds. */
  issuedAt: number;
  /** Expiry, epoch seconds. */
  expiresAt: number;
}

/**
 * The HMAC key.
 *
 * `AUTH_SECRET` is preferred, but falling back to the credentials themselves is
 * a useful property rather than a shortcut: changing the password then
 * invalidates every cookie signed with the old one, so a rotated password
 * really does lock out an old browser session.
 */
function secretMaterial(): string | undefined {
  const explicit = process.env.AUTH_SECRET?.trim();
  if (explicit && explicit.length > 0) return explicit;

  const user = process.env.AUTH_USERNAME?.trim();
  const password = process.env.AUTH_PASSWORD ?? '';
  if (!user || password.length === 0) return undefined;
  return `derived:${user}:${password}`;
}

let cachedKey: { material: string; key: Promise<CryptoKey> } | null = null;

function hmacKey(material: string): Promise<CryptoKey> {
  // Importing the key is not free, and middleware runs on every request.
  if (cachedKey?.material === material) return cachedKey.key;
  const key = crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(material),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  cachedKey = { material, key };
  return key;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function sign(body: string, material: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(material), new TextEncoder().encode(body));
  return base64UrlEncode(new Uint8Array(signature));
}

/** Length-independent, value-independent comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  // Compare a fixed-size digest-of-equal-length pair: differing lengths still
  // walk the full loop so the timing carries no information about the prefix.
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/** Mint a cookie value for `username`. Returns null when no secret exists. */
export async function createSessionToken(username: string): Promise<string | null> {
  const material = secretMaterial();
  if (!material) return null;

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    username,
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS,
  };

  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(body, material)}`;
}

/**
 * Verify a cookie value. Returns the payload only when the signature matches
 * the *current* secret and the session has not expired.
 */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  const material = secretMaterial();
  if (!material) return null;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!timingSafeEqual(signature, await sign(body, material))) return null;

  const decoded = base64UrlDecode(body);
  if (!decoded) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(decoded)) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload?.username !== 'string' || typeof payload?.expiresAt !== 'number') return null;
  if (payload.expiresAt * 1000 <= Date.now()) return null;

  // A password change rotates the derived secret, but an explicit AUTH_SECRET
  // does not - so re-check the username against the configured account.
  const configured = process.env.AUTH_USERNAME?.trim();
  if (configured && payload.username !== configured) return null;

  return payload;
}

/** Cookie attributes shared by the set and clear paths. */
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };
}
