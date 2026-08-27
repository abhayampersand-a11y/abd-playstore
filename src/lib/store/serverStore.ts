import 'server-only';

import { getCurrentSession } from '../auth/server';
import { AppError } from '../errors';
import { PrismaResearchRepository } from './prismaRepository';

/**
 * Server-side access to the persistent store.
 *
 * The API routes go through here rather than constructing a repository
 * themselves, so "who owns this data" is answered in exactly one place.
 */

/** Whether a Postgres connection string is present. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * The account that owns the rows this request may touch.
 *
 * With sign-in configured this is the session username. Without it the app is
 * single-user by definition, so everything belongs to one fixed owner - and if
 * auth is switched on later, that data stays reachable by moving the rows
 * rather than by widening a query.
 */
export async function getOwner(): Promise<string> {
  const session = await getCurrentSession();
  return session?.username ?? 'local';
}

export async function getServerRepository(): Promise<PrismaResearchRepository> {
  if (!isDatabaseConfigured()) {
    throw new AppError('NOT_FOUND', 'Server-side storage is not configured.', {
      hint: 'Set DATABASE_URL in .env and restart the server, or use browser storage.',
      status: 503,
    });
  }
  return new PrismaResearchRepository(await getOwner());
}
