/**
 * The single account, defined entirely by environment variables.
 *
 * There is no user table: this app is a personal research tool, so "who may
 * sign in" is a deployment concern rather than a data model. Set
 * `AUTH_USERNAME` and `AUTH_PASSWORD` and that is the only account that exists.
 */

export interface AuthConfig {
  username: string;
  password: string;
}

/** The configured account, or null when the environment does not define one. */
export function getAuthConfig(): AuthConfig | null {
  const username = process.env.AUTH_USERNAME?.trim();
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

export function isAuthConfigured(): boolean {
  return getAuthConfig() !== null;
}

/**
 * Whether auth is *enforced* for this request path.
 *
 * Unconfigured development stays open so a fresh clone runs without ceremony.
 * Production is fail-closed: with no credentials set, nothing is reachable and
 * the login screen explains why, rather than silently serving the whole app to
 * the internet.
 */
export function isAuthEnforced(): boolean {
  return isAuthConfigured() || process.env.NODE_ENV === 'production';
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compare submitted credentials against the configured pair.
 *
 * Both sides are hashed first so the comparison runs over two equal-length hex
 * strings - the length of the real password never leaks through the timing of
 * a mismatch, and a wrong username costs the same as a wrong password.
 */
export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const config = getAuthConfig();
  if (!config) return false;

  const [submitted, expected] = await Promise.all([
    digest(`${username.trim()}\u0000${password}`),
    digest(`${config.username}\u0000${config.password}`),
  ]);

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= submitted.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
