import { LocalResearchRepository, isStorageAvailable } from './localRepository';
import type { ResearchRepository } from './repository';

/**
 * One-time lift of browser-stored research into the server store.
 *
 * Runs the first time the app loads with a database configured. It copies
 * rather than moves: the local copy is left untouched, so a failed or partial
 * migration costs nothing and can simply be retried. The flag is only written
 * once every record has been accepted by the server.
 */

const MIGRATED_KEY = 'appscout.migrated-to-server';

export interface MigrationResult {
  migrated: number;
  skipped: number;
}

function alreadyMigrated(): boolean {
  try {
    return window.localStorage.getItem(MIGRATED_KEY) === 'true';
  } catch {
    // Storage blocked - there is nothing local to migrate either.
    return true;
  }
}

export async function migrateLocalRecords(target: ResearchRepository): Promise<MigrationResult | null> {
  if (!isStorageAvailable() || alreadyMigrated()) return null;

  const local = new LocalResearchRepository();
  const localItems = await local.list();
  if (localItems.length === 0) {
    markMigrated();
    return null;
  }

  // Anything the server already holds wins - re-uploading would overwrite a
  // newer server-side edit with a stale local copy.
  const existing = new Set((await target.list()).map((item) => item.id));

  let migrated = 0;
  let skipped = 0;

  for (const item of localItems) {
    if (existing.has(item.id)) {
      skipped += 1;
      continue;
    }
    const record = await local.get(item.id);
    if (!record) {
      skipped += 1;
      continue;
    }
    await target.save(record);
    migrated += 1;
  }

  markMigrated();
  return { migrated, skipped };
}

function markMigrated(): void {
  try {
    window.localStorage.setItem(MIGRATED_KEY, 'true');
  } catch {
    // Not fatal: worst case the copy is attempted again, and the id check
    // above makes a second run a no-op.
  }
}
