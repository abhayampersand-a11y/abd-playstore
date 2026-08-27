'use client';

import { useEffect, useState } from 'react';

import type { ResearchRecord } from '../types';
import { useResearchStore } from './ResearchStore';

/**
 * Hydrate every stored research record.
 *
 * List views normally read the lightweight index; the cross-research views
 * (Competitors, AI Opportunities) genuinely need the full records. The index is
 * capped at 60 entries, so this stays bounded - and it is cancelled on unmount
 * so navigating away mid-load does not set state on a dead component.
 */
export function useAllRecords(): { records: ResearchRecord[]; loading: boolean } {
  const { items, ready, getRecord } = useResearchStore();
  const [records, setRecords] = useState<ResearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const loaded = await Promise.all(items.map((item) => getRecord(item.id)));
      if (cancelled) return;
      setRecords(loaded.filter((record): record is ResearchRecord => record !== null));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, items, getRecord]);

  return { records, loading };
}
