import { fail, ok } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { getServerRepository } from '@/lib/store/serverStore';

/** A single persisted research document. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** GET /api/records/[id] - the full record. */
export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const repository = await getServerRepository();
    const record = await repository.get(id);
    if (!record) {
      throw new AppError('NOT_FOUND', 'That research no longer exists.');
    }
    return ok({ record });
  } catch (error) {
    return fail(error);
  }
}

/** DELETE /api/records/[id] */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const repository = await getServerRepository();
    await repository.remove(id);
    return ok({ removed: true });
  } catch (error) {
    return fail(error);
  }
}
