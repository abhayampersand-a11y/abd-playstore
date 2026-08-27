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

import { AppError, toAppError } from '@/lib/errors';
import { unlockedStages, type WorkspaceStageId } from '@/lib/research/stages';
import { useResearchStore } from '@/lib/store/ResearchStore';
import type { ResearchRecord } from '@/lib/types';

interface WorkspaceValue {
  researchId: string;
  record: ResearchRecord | null;
  loading: boolean;
  error: AppError | null;
  unlocked: Set<WorkspaceStageId>;
  /** Merge a patch into the record and persist it. */
  update: (patch: Partial<ResearchRecord>) => Promise<void>;
  reload: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useResearchWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useResearchWorkspace must be used inside <ResearchWorkspaceProvider>');
  }
  return value;
}

/**
 * Loads one research record once for the whole workspace, so the six stage
 * pages share a single read instead of each deserialising the record on mount.
 */
export function ResearchWorkspaceProvider({
  researchId,
  children,
}: {
  researchId: string;
  children: ReactNode;
}) {
  const { getRecord, saveRecord, ready } = useResearchStore();
  const [record, setRecord] = useState<ResearchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  /**
   * The record as of right now, readable without going through a state updater.
   *
   * `update` needs the current value to build the patched one, and doing that
   * inside `setRecord` would put a side effect in an updater - which React is
   * free to run twice, sending two writes for one edit.
   */
  const recordRef = useRef<ResearchRecord | null>(null);

  const applyRecord = useCallback((next: ResearchRecord | null) => {
    recordRef.current = next;
    setRecord(next);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await getRecord(researchId);
      if (!found) {
        setError(
          new AppError('NOT_FOUND', 'This research is not stored on this device.', {
            hint: 'Research is saved in your browser. It will not appear in a different browser or a private window.',
          }),
        );
        applyRecord(null);
      } else {
        applyRecord(found);
      }
    } catch (caught) {
      setError(toAppError(caught));
    } finally {
      setLoading(false);
    }
  }, [applyRecord, getRecord, researchId]);

  useEffect(() => {
    if (!ready) return;
    void reload();
  }, [ready, reload]);

  /**
   * Patch the record and persist it.
   *
   * The optimistic update lands first so the stage renders immediately, but the
   * promise does not settle until the write has, and a failed write is rolled
   * back and rethrown. Callers await this before reporting success - without
   * that, a stage can show a finished analysis, and say so, while nothing was
   * ever stored.
   */
  const update = useCallback(
    async (patch: Partial<ResearchRecord>) => {
      const current = recordRef.current;
      if (!current) return;

      const next: ResearchRecord = { ...current, ...patch, updatedAt: new Date().toISOString() };
      applyRecord(next);

      try {
        await saveRecord(next);
      } catch (caught) {
        applyRecord(current);
        throw toAppError(caught);
      }
    },
    [applyRecord, saveRecord],
  );

  const value = useMemo<WorkspaceValue>(
    () => ({
      researchId,
      record,
      loading: loading || !ready,
      error,
      unlocked: unlockedStages(record),
      update,
      reload,
    }),
    [researchId, record, loading, ready, error, update, reload],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
