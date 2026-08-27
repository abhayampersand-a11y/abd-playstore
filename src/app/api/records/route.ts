import { researchRecordSchema } from '@/lib/api-schemas';
import { fail, ok, readJson } from '@/lib/api-response';
import { getServerRepository } from '@/lib/store/serverStore';
import type { ResearchRecord } from '@/lib/types';

/**
 * The persisted research collection.
 *
 * Every handler resolves its repository through `getServerRepository`, which
 * scopes it to the signed-in account - there is no unscoped query in this file.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/records - the list index and the saved ideas, in one round trip. */
export async function GET() {
  try {
    const repository = await getServerRepository();
    const [items, savedIdeas] = await Promise.all([
      repository.list(),
      repository.listSavedIdeas(),
    ]);
    return ok({ items, savedIdeas });
  } catch (error) {
    return fail(error);
  }
}

/** POST /api/records - create or update one record. */
export async function POST(request: Request) {
  try {
    const repository = await getServerRepository();
    const parsed = researchRecordSchema.parse(await readJson(request));
    await repository.save(parsed as unknown as ResearchRecord);
    return ok({ saved: true });
  } catch (error) {
    return fail(error);
  }
}

/** DELETE /api/records - remove everything this account owns. */
export async function DELETE() {
  try {
    const repository = await getServerRepository();
    await repository.clear();
    return ok({ cleared: true });
  } catch (error) {
    return fail(error);
  }
}
