'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { toAppError, type AppError } from '../errors';
import type { ResearchListItem, ResearchRecord, SavedIdea } from '../types';
import { LocalResearchRepository, isStorageAvailable } from './localRepository';
import { migrateLocalRecords } from './migrate';
import { RemoteResearchRepository } from './remoteRepository';
import { toListItem, type ResearchRepository } from './repository';

export interface DashboardStats {
  totalResearches: number;
  savedOpportunities: number;
  highOpportunityIdeas: number;
  averageOpportunityScore: number;
  analysedCount: number;
}

interface ResearchStoreValue {
  ready: boolean;
  storageAvailable: boolean;
  /** Set when the store could not be read - e.g. the database is unreachable. */
  storageError: AppError | null;
  items: ResearchListItem[];
  savedIdeas: SavedIdea[];
  stats: DashboardStats;
  getRecord: (id: string) => Promise<ResearchRecord | null>;
  saveRecord: (record: ResearchRecord) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  toggleSaved: (id: string) => Promise<boolean>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ResearchStoreContext = createContext<ResearchStoreValue | null>(null);

export function useResearchStore(): ResearchStoreValue {
  const value = useContext(ResearchStoreContext);
  if (!value) {
    throw new Error('useResearchStore must be used inside <ResearchStoreProvider>');
  }
  return value;
}

function computeStats(items: ResearchListItem[]): DashboardStats {
  const scored = items.filter(
    (item): item is ResearchListItem & { opportunityScore: number } =>
      typeof item.opportunityScore === 'number',
  );
  const total = scored.reduce((sum, item) => sum + item.opportunityScore, 0);

  return {
    totalResearches: items.length,
    savedOpportunities: items.filter((item) => item.saved).length,
    highOpportunityIdeas: scored.filter((item) => item.opportunityScore >= 7).length,
    averageOpportunityScore: scored.length > 0 ? Math.round((total / scored.length) * 10) / 10 : 0,
    analysedCount: scored.length,
  };
}

interface ResearchStoreProviderProps {
  children: ReactNode;
  /**
   * True when DATABASE_URL is set, resolved on the server so the first render
   * already knows where data lives - otherwise the app would flash a local
   * (probably empty) list before switching stores.
   */
  persistent?: boolean;
}

export function ResearchStoreProvider({ children, persistent = false }: ResearchStoreProviderProps) {
  // Chosen once, from configuration. Nothing downstream knows which
  // implementation it is talking to - both satisfy the same six methods.
  const repositoryRef = useRef<ResearchRepository>(
    persistent ? new RemoteResearchRepository() : new LocalResearchRepository(),
  );

  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageError, setStorageError] = useState<AppError | null>(null);
  const [items, setItems] = useState<ResearchListItem[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);

  /**
   * Re-read the index.
   *
   * Deliberately does not throw: an unreadable store is a state the UI renders
   * (see `storageError`), not an exception every caller has to guard. Writes
   * still surface their own failures - it is only the re-read that is absorbed.
   */
  const refresh = useCallback(async () => {
    const repository = repositoryRef.current;
    try {
      const [nextItems, nextIdeas] = await Promise.all([
        repository.list(),
        repository.listSavedIdeas(),
      ]);
      setItems(nextItems);
      setSavedIdeas(nextIdeas);
      setStorageError(null);
    } catch (error) {
      setStorageError(toAppError(error));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // On the server store, browser storage no longer gates anything.
    setStorageAvailable(persistent || isStorageAvailable());

    void (async () => {
      if (persistent) {
        try {
          await migrateLocalRecords(repositoryRef.current);
        } catch (error) {
          // A failed lift must not block the app: the local copy is untouched
          // and the migration retries on the next load.
          console.warn('[appscout] could not migrate local research to the server', error);
        }
      }

      // `refresh` records its own failure rather than throwing, so the app
      // always becomes ready - an unreachable store renders as a banner over
      // empty lists, never as a page that spins forever.
      await refresh();
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh, persistent]);

  // Keep multiple tabs consistent. Only meaningful for the local store - the
  // server store has no localStorage writes to observe.
  useEffect(() => {
    if (persistent) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key.startsWith('appscout.')) void refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh, persistent]);

  const getRecord = useCallback((id: string) => repositoryRef.current.get(id), []);

  const saveRecord = useCallback(
    async (record: ResearchRecord) => {
      const stamped: ResearchRecord = { ...record, updatedAt: new Date().toISOString() };
      await repositoryRef.current.save(stamped);
      // Optimistic index update so navigation feels instant.
      setItems((current) => {
        const without = current.filter((item) => item.id !== stamped.id);
        return [toListItem(stamped), ...without].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
      await refresh();
    },
    [refresh],
  );

  const removeRecord = useCallback(
    async (id: string) => {
      await repositoryRef.current.remove(id);
      setItems((current) => current.filter((item) => item.id !== id));
      await refresh();
    },
    [refresh],
  );

  const toggleSaved = useCallback(
    async (id: string) => {
      const record = await repositoryRef.current.get(id);
      if (!record) return false;
      const next: ResearchRecord = { ...record, saved: !record.saved };
      await repositoryRef.current.save(next);
      await refresh();
      return next.saved;
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    await repositoryRef.current.clear();
    setItems([]);
    setSavedIdeas([]);
  }, []);

  const value = useMemo<ResearchStoreValue>(
    () => ({
      ready,
      storageAvailable,
      storageError,
      items,
      savedIdeas,
      stats: computeStats(items),
      getRecord,
      saveRecord,
      removeRecord,
      toggleSaved,
      clearAll,
      refresh,
    }),
    [ready, storageAvailable, storageError, items, savedIdeas, getRecord, saveRecord, removeRecord, toggleSaved, clearAll, refresh],
  );

  return <ResearchStoreContext.Provider value={value}>{children}</ResearchStoreContext.Provider>;
}
