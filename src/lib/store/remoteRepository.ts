import { AppError, parseApiError } from '../errors';
import type { ResearchListItem, ResearchRecord, SavedIdea } from '../types';
import type { ResearchRepository } from './repository';

/**
 * Browser-side repository backed by `/api/records`.
 *
 * A Prisma client cannot run in the browser, so this is the client half of the
 * server repository: same six methods, same contract, one fetch each. Nothing
 * above it knows whether the data ends up in Postgres or in localStorage.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    throw new AppError('NETWORK_ERROR', 'Could not reach the AppScout server.', {
      hint: 'Check that the server is running and your connection is up.',
      cause: error,
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) throw new AppError('UNKNOWN', 'The server returned an unreadable response.');
  }

  if (!response.ok) throw parseApiError(response.status, payload);
  return payload as T;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export class RemoteResearchRepository implements ResearchRepository {
  /**
   * The list and the saved ideas arrive together from a single GET, so a
   * refresh is one round trip rather than two. The most recent response is
   * cached only long enough for the paired call to read it.
   */
  private pending: Promise<{ items: ResearchListItem[]; savedIdeas: SavedIdea[] }> | null = null;

  private index(): Promise<{ items: ResearchListItem[]; savedIdeas: SavedIdea[] }> {
    if (!this.pending) {
      this.pending = request<{ items: ResearchListItem[]; savedIdeas: SavedIdea[] }>('/api/records').finally(
        () => {
          // Cleared on the microtask after both callers have attached, so the
          // paired list()/listSavedIdeas() share one request and the next
          // refresh still hits the server.
          queueMicrotask(() => {
            this.pending = null;
          });
        },
      );
    }
    return this.pending;
  }

  async list(): Promise<ResearchListItem[]> {
    return (await this.index()).items;
  }

  async listSavedIdeas(): Promise<SavedIdea[]> {
    return (await this.index()).savedIdeas;
  }

  async get(id: string): Promise<ResearchRecord | null> {
    try {
      const { record } = await request<{ record: ResearchRecord }>(`/api/records/${encodeURIComponent(id)}`);
      return record;
    } catch (error) {
      // A missing record is an answer, not a failure - the local repository
      // returns null for the same case and callers rely on that.
      if (error instanceof AppError && error.code === 'NOT_FOUND') return null;
      throw error;
    }
  }

  async save(record: ResearchRecord): Promise<void> {
    await request('/api/records', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(record),
    });
  }

  async remove(id: string): Promise<void> {
    await request(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async clear(): Promise<void> {
    await request('/api/records', { method: 'DELETE' });
  }
}
