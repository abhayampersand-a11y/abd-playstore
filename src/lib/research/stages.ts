import type { ResearchRecord } from '../types';

/**
 * The six workspace stages a research moves through. The user should always be
 * able to see where they are and what is still locked, so this list is the
 * single source of truth for the workspace stepper, the routes and the
 * "what's next" call to action.
 */
export type WorkspaceStageId = 'overview' | 'competitors' | 'reviews' | 'opportunity' | 'buildPlan' | 'devPrompt';

export interface WorkspaceStage {
  id: WorkspaceStageId;
  label: string;
  shortLabel: string;
  /** Path suffix appended to /research/[id]. Empty string is the index route. */
  segment: string;
  description: string;
}

export const WORKSPACE_STAGES: WorkspaceStage[] = [
  {
    id: 'overview',
    label: 'Search',
    shortLabel: 'Search',
    segment: '',
    description: 'What Google Play returned for this keyword.',
  },
  {
    id: 'competitors',
    label: 'Competitors',
    shortLabel: 'Competitors',
    segment: '/competitors',
    description: 'Every app you would be up against.',
  },
  {
    id: 'reviews',
    label: 'Review Intelligence',
    shortLabel: 'Reviews',
    segment: '/reviews',
    description: 'What users complain about, praise and ask for.',
  },
  {
    id: 'opportunity',
    label: 'AI Opportunity',
    shortLabel: 'Opportunity',
    segment: '/opportunity',
    description: 'The AI scores the market and gives a verdict.',
  },
  {
    id: 'buildPlan',
    label: 'Build Plan',
    shortLabel: 'Build Plan',
    segment: '/build-plan',
    description: 'The full product and technical plan.',
  },
  {
    id: 'devPrompt',
    label: 'Dev Prompt',
    shortLabel: 'Dev Prompt',
    segment: '/dev-prompt',
    description: 'A complete coding brief for an AI assistant.',
  },
];

export function stageHref(researchId: string, stage: WorkspaceStage): string {
  return `/research/${researchId}${stage.segment}`;
}

/** Which stages have data behind them for this record. */
export function unlockedStages(record: ResearchRecord | null): Set<WorkspaceStageId> {
  const unlocked = new Set<WorkspaceStageId>();
  if (!record) return unlocked;

  unlocked.add('overview');
  if (record.competitors.length > 0) unlocked.add('competitors');
  if (record.reviewInsights.reviewsAnalysed > 0) unlocked.add('reviews');
  if (record.analysis) unlocked.add('opportunity');
  if (record.buildPlan) unlocked.add('buildPlan');
  if (record.devPrompt) unlocked.add('devPrompt');

  return unlocked;
}

/**
 * The next thing the user should do. Drives the primary CTA at the bottom of
 * every workspace page, so the flow never dead-ends.
 */
export function nextAction(record: ResearchRecord | null): {
  stage: WorkspaceStage;
  label: string;
  needsGeneration: boolean;
} | null {
  if (!record) return null;

  const stageById = (id: WorkspaceStageId) => WORKSPACE_STAGES.find((stage) => stage.id === id)!;

  if (!record.analysis) {
    return { stage: stageById('opportunity'), label: 'Run AI opportunity analysis', needsGeneration: true };
  }
  if (!record.buildPlan) {
    return { stage: stageById('buildPlan'), label: 'Build This App', needsGeneration: true };
  }
  if (!record.devPrompt) {
    return { stage: stageById('devPrompt'), label: 'Generate development prompt', needsGeneration: true };
  }
  return null;
}
