import type { ResearchListItem, ResearchRecord, SavedIdea } from '../types';

/**
 * Persistence contract.
 *
 * The app ships with `LocalResearchRepository` (browser storage, zero infra).
 * A `PostgresResearchRepository` backed by Prisma implements the same six
 * methods against `prisma/schema.prisma` and is swapped in at the provider -
 * no component or page changes. Every method is async precisely so that swap
 * requires no call-site changes.
 */
export interface ResearchRepository {
  list(): Promise<ResearchListItem[]>;
  get(id: string): Promise<ResearchRecord | null>;
  save(record: ResearchRecord): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  listSavedIdeas(): Promise<SavedIdea[]>;
}

/** Project a full record down to the fields list views need. */
export function toListItem(record: ResearchRecord): ResearchListItem {
  return {
    id: record.id,
    createdAt: record.createdAt,
    keyword: record.input.keyword,
    country: record.input.country,
    competitorsAnalysed: record.marketStats.competitorsAnalysed,
    reviewsAnalysed: record.marketStats.reviewsAnalysed,
    opportunityScore: record.analysis?.opportunityScore,
    recommendation: record.analysis?.recommendation,
    stage: record.stage,
    status: record.status,
    saved: record.saved,
    appName: record.analysis?.recommendedApp.name ?? record.buildPlan?.appName,
  };
}

export function toSavedIdea(record: ResearchRecord): SavedIdea | null {
  if (!record.analysis) return null;
  return {
    id: record.id,
    researchId: record.id,
    createdAt: record.createdAt,
    name: record.buildPlan?.appName ?? record.analysis.recommendedApp.name,
    tagline: record.buildPlan?.tagline ?? record.analysis.recommendedApp.tagline,
    keyword: record.input.keyword,
    opportunityScore: record.analysis.opportunityScore,
    recommendation: record.analysis.recommendation,
  };
}
