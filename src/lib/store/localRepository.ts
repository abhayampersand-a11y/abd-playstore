import type { ResearchListItem, ResearchRecord, SavedIdea } from '../types';
import { toListItem, toSavedIdea, type ResearchRepository } from './repository';

/**
 * Browser-storage repository.
 *
 * The index and the records are stored separately: list views read one small
 * key instead of deserialising every full research record, which keeps the
 * dashboard fast once a user has a few dozen researches.
 *
 * localStorage caps out around 5MB. Rather than fail a save when a user hits
 * that ceiling, we evict the oldest unsaved research and retry - explicitly
 * saved ideas are never evicted.
 */

const INDEX_KEY = 'appscout.index.v1';
const RECORD_PREFIX = 'appscout.research.v1.';
const MAX_RECORDS = 60;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    // Touch the API - it throws outright in some privacy modes.
    const probe = '__appscout_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function recordKey(id: string): string {
  return `${RECORD_PREFIX}${id}`;
}

function readIndex(store: Storage): ResearchListItem[] {
  try {
    const raw = store.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ResearchListItem[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(store: Storage, index: ResearchListItem[]): void {
  store.setItem(INDEX_KEY, JSON.stringify(index));
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

export class LocalResearchRepository implements ResearchRepository {
  async list(): Promise<ResearchListItem[]> {
    const store = storage();
    if (!store) return [];
    return readIndex(store).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<ResearchRecord | null> {
    const store = storage();
    if (!store) return null;
    try {
      const raw = store.getItem(recordKey(id));
      if (!raw) return null;
      return JSON.parse(raw) as ResearchRecord;
    } catch {
      return null;
    }
  }

  async save(record: ResearchRecord): Promise<void> {
    const store = storage();
    if (!store) return;

    const payload = JSON.stringify(record);
    const index = readIndex(store).filter((item) => item.id !== record.id);
    index.unshift(toListItem(record));

    // Trim the tail, keeping anything the user explicitly saved.
    const trimmed: ResearchListItem[] = [];
    for (const item of index) {
      if (trimmed.length < MAX_RECORDS || item.saved) {
        trimmed.push(item);
      } else {
        store.removeItem(recordKey(item.id));
      }
    }

    try {
      store.setItem(recordKey(record.id), payload);
      writeIndex(store, trimmed);
      return;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
    }

    // Quota hit: evict oldest unsaved records until the write fits.
    const evictable = [...trimmed]
      .filter((item) => !item.saved && item.id !== record.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const victim of evictable) {
      store.removeItem(recordKey(victim.id));
      const remaining = trimmed.filter((item) => item.id !== victim.id);
      try {
        store.setItem(recordKey(record.id), payload);
        writeIndex(store, remaining);
        return;
      } catch (error) {
        if (!isQuotaError(error)) throw error;
        trimmed.splice(0, trimmed.length, ...remaining);
      }
    }

    throw new Error('Browser storage is full. Delete some research from History and try again.');
  }

  async remove(id: string): Promise<void> {
    const store = storage();
    if (!store) return;
    store.removeItem(recordKey(id));
    writeIndex(
      store,
      readIndex(store).filter((item) => item.id !== id),
    );
  }

  async clear(): Promise<void> {
    const store = storage();
    if (!store) return;
    for (const item of readIndex(store)) {
      store.removeItem(recordKey(item.id));
    }
    store.removeItem(INDEX_KEY);
  }

  async listSavedIdeas(): Promise<SavedIdea[]> {
    const store = storage();
    if (!store) return [];

    const ideas: SavedIdea[] = [];
    for (const item of readIndex(store)) {
      if (!item.saved) continue;
      const record = await this.get(item.id);
      if (!record) continue;
      const idea = toSavedIdea(record);
      if (idea) ideas.push(idea);
    }
    return ideas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** True when persistence is actually available in this browser context. */
export function isStorageAvailable(): boolean {
  return storage() !== null;
}
