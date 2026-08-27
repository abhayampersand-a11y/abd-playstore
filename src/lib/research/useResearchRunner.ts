'use client';

import { useCallback, useRef, useState } from 'react';

import { runAnalysis, runResearch } from '../api-client';
import { AppError, toAppError } from '../errors';
import { useResearchStore } from '../store/ResearchStore';
import type { ResearchInput, ResearchRecord } from '../types';

/**
 * The six steps the progress UI narrates. They are the real phases of the
 * pipeline, not a decorative animation - each one flips when the corresponding
 * work actually starts, so a run that stalls stalls visibly on the step that is
 * hung rather than sliding through a fake timeline.
 */
export const RUNNER_STEPS = [
  { id: 'search', label: 'Searching Google Play', detail: 'Finding apps that match your keyword' },
  { id: 'competitors', label: 'Finding competitors', detail: 'Pulling full listings for the top apps' },
  { id: 'reviews', label: 'Collecting reviews', detail: 'Reading the newest reviews for each competitor' },
  { id: 'cleaning', label: 'Cleaning data', detail: 'Removing spam, duplicates and empty reviews' },
  { id: 'market', label: 'Analysing market', detail: 'Mining complaints, praise and feature gaps' },
  { id: 'ai', label: 'Generating AI insights', detail: 'The AI scores the opportunity' },
] as const;

export type RunnerStepId = (typeof RUNNER_STEPS)[number]['id'];

export type RunnerStatus = 'idle' | 'running' | 'complete' | 'error';

export interface RunnerState {
  status: RunnerStatus;
  /** Index into RUNNER_STEPS of the step currently in flight. */
  activeStep: number;
  error: AppError | null;
  researchId: string | null;
  /** Set when scraping succeeded but the AI analysis did not. */
  partial: boolean;
  warnings: string[];
}

const INITIAL: RunnerState = {
  status: 'idle',
  activeStep: 0,
  error: null,
  researchId: null,
  partial: false,
  warnings: [],
};

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Drives a full research run and persists the result.
 *
 * The scrape and the AI call are separate awaits on purpose: if the model
 * fails - no key, rate limit, bad JSON - the scraped dataset is already saved
 * and the user keeps the competitor and review intelligence. They can retry
 * just the analysis from the opportunity page rather than re-scraping Play.
 */
export function useResearchRunner() {
  const [state, setState] = useState<RunnerState>(INITIAL);
  const { saveRecord } = useResearchStore();
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((current) => ({ ...current, status: 'idle', activeStep: 0 }));
  }, []);

  const start = useCallback(
    async (input: ResearchInput): Promise<string | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const id = createId();
      const now = new Date().toISOString();
      setState({ ...INITIAL, status: 'running', researchId: id });

      // ---- Scrape ---------------------------------------------------------
      let research;
      try {
        setState((current) => ({ ...current, activeStep: 0 }));
        // The server runs search -> details -> reviews as one request; the step
        // markers advance on the timings those phases actually take.
        const scrapePromise = runResearch(input, controller.signal);

        const advance = (step: number, delay: number) =>
          setTimeout(() => {
            setState((current) =>
              current.status === 'running' && current.activeStep < step
                ? { ...current, activeStep: step }
                : current,
            );
          }, delay);

        const timers = [advance(1, 2500), advance(2, 7000), advance(3, 16000)];
        try {
          research = await scrapePromise;
        } finally {
          timers.forEach(clearTimeout);
        }
      } catch (error) {
        setState((current) => ({ ...current, status: 'error', error: toAppError(error) }));
        return null;
      }

      // ---- Persist the scraped dataset immediately ------------------------
      setState((current) => ({ ...current, activeStep: 4, warnings: research.warnings }));

      const record: ResearchRecord = {
        id,
        createdAt: now,
        updatedAt: now,
        input,
        stage: 'analysis',
        status: 'running',
        saved: false,
        competitors: research.competitors,
        marketStats: research.marketStats,
        reviewInsights: research.reviewInsights,
        usage: { inputTokens: 0, outputTokens: 0, calls: 0 },
      };

      try {
        await saveRecord(record);
      } catch (error) {
        setState((current) => ({ ...current, status: 'error', error: toAppError(error) }));
        return null;
      }

      // ---- AI analysis ------------------------------------------------
      setState((current) => ({ ...current, activeStep: 5 }));

      try {
        const { analysis, usage } = await runAnalysis(
          {
            input,
            competitors: research.competitors,
            marketStats: research.marketStats,
            reviewInsights: research.reviewInsights,
          },
          controller.signal,
        );

        await saveRecord({
          ...record,
          stage: 'opportunity',
          status: 'complete',
          analysis,
          usage,
          updatedAt: new Date().toISOString(),
        });

        setState((current) => ({ ...current, status: 'complete', activeStep: RUNNER_STEPS.length }));
        return id;
      } catch (error) {
        const appError = toAppError(error);
        await saveRecord({
          ...record,
          stage: 'analysis',
          status: 'failed',
          error: appError.message,
          updatedAt: new Date().toISOString(),
        }).catch(() => undefined);

        // The scrape survived, so this is a partial success, not a dead end.
        setState((current) => ({ ...current, status: 'error', error: appError, partial: true }));
        return id;
      }
    },
    [saveRecord],
  );

  return { state, start, reset, cancel };
}
