import 'server-only';

import { Prisma, PrismaClient } from '@prisma/client';

import { AppError, toAppError } from '../errors';
import type { ResearchListItem, ResearchRecord, SavedIdea } from '../types';
import { toSavedIdea, type ResearchRepository } from './repository';

/**
 * PostgreSQL / Neon repository.
 *
 * Runs only on the server - a Prisma client cannot exist in the browser - so
 * the client-side store reaches it through `/api/records` rather than
 * instantiating it. Every method is scoped to `owner`, which is the signed-in
 * account, so the scoping is structural rather than something each call site
 * has to remember.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * One client per process. Next's dev server re-evaluates modules on every edit,
 * and a fresh PrismaClient each time exhausts the connection pool within a few
 * saves - hence the global in development.
 */
export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Columns a list view needs - deliberately never the `record` blob. */
const LIST_COLUMNS = {
  id: true,
  createdAt: true,
  keyword: true,
  country: true,
  competitorsAnalysed: true,
  reviewsAnalysed: true,
  opportunityScore: true,
  recommendation: true,
  stage: true,
  status: true,
  saved: true,
  appName: true,
} satisfies Prisma.ResearchSelect;

type ListRow = Prisma.ResearchGetPayload<{ select: typeof LIST_COLUMNS }>;

function toListItemRow(row: ListRow): ResearchListItem {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    keyword: row.keyword,
    country: row.country,
    competitorsAnalysed: row.competitorsAnalysed,
    reviewsAnalysed: row.reviewsAnalysed,
    opportunityScore: row.opportunityScore ?? undefined,
    recommendation: (row.recommendation as ResearchListItem['recommendation']) ?? undefined,
    stage: row.stage as ResearchListItem['stage'],
    status: row.status as ResearchListItem['status'],
    saved: row.saved,
    appName: row.appName ?? undefined,
  };
}

/**
 * Project a record onto its row.
 *
 * The promoted columns are derived here and nowhere else, so they cannot drift
 * from the document they summarise.
 */
function toRow(record: ResearchRecord, owner: string) {
  return {
    id: record.id,
    owner,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    keyword: record.input.keyword,
    country: record.input.country,
    stage: record.stage,
    status: record.status,
    saved: record.saved,
    competitorsAnalysed: record.marketStats.competitorsAnalysed,
    reviewsAnalysed: record.marketStats.reviewsAnalysed,
    opportunityScore: record.analysis?.opportunityScore ?? null,
    recommendation: record.analysis?.recommendation ?? null,
    appName: record.analysis?.recommendedApp.name ?? record.buildPlan?.appName ?? null,
    inputTokens: record.usage.inputTokens,
    outputTokens: record.usage.outputTokens,
    record: record as unknown as Prisma.InputJsonValue,
  };
}

/**
 * Turn a Prisma failure into the app's error taxonomy.
 *
 * Prisma's own messages name the host, port and database - useful in a server
 * log, but they travel all the way to the browser through the error envelope,
 * so they are replaced here with something the operator can act on and an
 * attacker learns nothing from. The original is kept as `cause` for the log.
 */
function mapPrismaError(error: unknown): AppError {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError('DATABASE_ERROR', 'Could not connect to the database.', {
      hint: 'Check DATABASE_URL in .env and that the Neon project still exists and is not suspended.',
      cause: error,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P1000':
        return new AppError('DATABASE_ERROR', 'The database rejected the credentials.', {
          hint: 'The password in DATABASE_URL is wrong - reset the Neon role password and update .env.',
          cause: error,
        });
      case 'P1001':
      case 'P1002':
        return new AppError('DATABASE_ERROR', 'The database server could not be reached.', {
          hint: 'Neon suspends idle projects; the first request can time out. Retry, and check the project is still running.',
          cause: error,
        });
      case 'P1003':
        return new AppError('DATABASE_ERROR', 'That database does not exist.', {
          hint: 'Check the database name at the end of DATABASE_URL.',
          cause: error,
        });
      case 'P2021':
      case 'P2022':
        return new AppError('DATABASE_ERROR', 'The database schema has not been created yet.', {
          hint: 'Run `npm run prisma:push` to create the tables, then retry.',
          cause: error,
        });
      default:
        return new AppError('DATABASE_ERROR', `The database rejected the request (${error.code}).`, {
          cause: error,
        });
    }
  }

  return toAppError(error);
}

/**
 * Whether a failure is worth trying again.
 *
 * Only connection-class failures qualify. A DNS lookup or TCP dial can fail
 * transiently - flaky resolvers and Neon's idle-suspend wake-up both produce
 * exactly this - and surfacing that as an error screen for something that
 * succeeds 400ms later is noise, not information. A schema or constraint
 * failure is deterministic and is reported immediately.
 */
function isTransient(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P1001' || error.code === 'P1002')
  );
}

/**
 * Sized for a Neon cold start, not for a network round trip.
 *
 * Neon suspends an idle project, and the first request after that has to wake
 * the compute - which can take a few seconds and fails as a connection error
 * until it is up. Three attempts spread over ~5s covers that; a database that
 * is genuinely misconfigured still reports within a few seconds.
 */
const RETRY_DELAYS_MS = [500, 1500, 3000];

/**
 * Run one query, retrying transient connection failures and translating
 * anything that survives into the app's error taxonomy.
 *
 * Retrying every operation is safe here: reads and deletes are idempotent, and
 * `save` is a scoped update-then-create that converges on the same row whether
 * it runs once or three times.
 */
async function run<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt < RETRY_DELAYS_MS.length && isTransient(error)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        continue;
      }
      throw mapPrismaError(error);
    }
  }
}

export class PrismaResearchRepository implements ResearchRepository {
  constructor(private readonly owner: string) {}

  async list(): Promise<ResearchListItem[]> {
    const rows = await run(() =>
      prisma.research.findMany({
        where: { owner: this.owner },
        orderBy: { createdAt: 'desc' },
        select: LIST_COLUMNS,
      }),
    );
    return rows.map(toListItemRow);
  }

  async get(id: string): Promise<ResearchRecord | null> {
    const row = await run(() =>
      prisma.research.findFirst({
        where: { id, owner: this.owner },
        select: { record: true },
      }),
    );
    return row ? (row.record as unknown as ResearchRecord) : null;
  }

  async save(record: ResearchRecord): Promise<void> {
    const row = toRow(record, this.owner);
    // Scoped upsert: `id` is the primary key, so a plain upsert would let one
    // account overwrite another's row by guessing an id. updateMany with the
    // owner in the filter cannot, and a zero-count update means it is ours to
    // create.
    await run(async () => {
      const { count } = await prisma.research.updateMany({
        where: { id: record.id, owner: this.owner },
        data: row,
      });
      if (count === 0) await prisma.research.create({ data: row });
    });
  }

  async remove(id: string): Promise<void> {
    await run(() => prisma.research.deleteMany({ where: { id, owner: this.owner } }));
  }

  async clear(): Promise<void> {
    await run(() => prisma.research.deleteMany({ where: { owner: this.owner } }));
  }

  async listSavedIdeas(): Promise<SavedIdea[]> {
    // Saved ideas are derived from the record, so the blob is needed here -
    // but only for rows actually flagged saved, which is a small set.
    const rows = await run(() =>
      prisma.research.findMany({
        where: { owner: this.owner, saved: true },
        orderBy: { createdAt: 'desc' },
        select: { record: true },
      }),
    );

    return rows
      .map((row) => toSavedIdea(row.record as unknown as ResearchRecord))
      .filter((idea): idea is SavedIdea => idea !== null);
  }
}
