import 'server-only';

import { serverConfig } from '../server-env';
import { buildMarketStats, selectImportantCompetitors } from '../playstore/normalize';
import {
  fetchCompetitorDetails,
  fetchReviewsForCompetitors,
  searchApps,
} from '../playstore/scrape';
import { buildCompetitorReviewStats, buildReviewInsights, emptyReviewInsights } from '../playstore/reviews';
import type { AnalysisPayload, Competitor, ResearchInput, ResearchResponse, ThemeBucket } from '../types';
import { truncate } from '../format';

/**
 * The research pipeline.
 *
 *   search -> normalise -> dedupe -> select important competitors
 *          -> fetch details -> fetch reviews -> clean -> group -> aggregate
 *
 * Nothing here talks to a model. The output is a fully-formed, human-readable
 * dataset that stands on its own; the AI call in `ai/analysis.ts` consumes a
 * deliberately small projection of it (see `buildAnalysisPayload`).
 */
export async function runResearchPipeline(input: ResearchInput): Promise<ResearchResponse> {
  const warnings: string[] = [];

  // 1. Search ---------------------------------------------------------------
  const detailBudget = Math.min(input.competitorCount, serverConfig.maxCompetitorDetail);
  const candidates = await searchApps({
    keyword: input.keyword,
    country: input.country,
    language: input.language,
    limit: detailBudget,
  });

  // 2. Detail ---------------------------------------------------------------
  const { competitors, warnings: detailWarnings } = await fetchCompetitorDetails({
    candidates,
    country: input.country,
    language: input.language,
    limit: detailBudget,
  });
  warnings.push(...detailWarnings);

  // 3. Select which competitors are worth spending review requests on --------
  // Reviews are the expensive part of the run, so they go to the apps that
  // carry the most signal rather than to whatever Play ranked first.
  const reviewTargets = selectImportantCompetitors(competitors, Math.min(competitors.length, 8));
  const perApp = Math.min(
    serverConfig.maxReviewsPerApp,
    Math.max(20, Math.ceil(input.reviewCount / Math.max(reviewTargets.length, 1))),
  );

  // 4. Reviews --------------------------------------------------------------
  const { reviewsByApp, warnings: reviewWarnings } = await fetchReviewsForCompetitors({
    competitors: reviewTargets,
    country: input.country,
    language: input.language,
    perApp,
  });
  warnings.push(...reviewWarnings);

  // 5. Per-app roll-up ------------------------------------------------------
  for (const competitor of competitors) {
    const reviews = reviewsByApp.get(competitor.appId);
    if (reviews && reviews.length > 0) {
      competitor.reviewStats = buildCompetitorReviewStats(reviews, competitor.title);
    }
  }

  // 6. Cross-app intelligence ----------------------------------------------
  const totalReviews = [...reviewsByApp.values()].reduce((sum, list) => sum + list.length, 0);
  const reviewInsights =
    totalReviews > 0 ? buildReviewInsights(reviewsByApp, competitors) : emptyReviewInsights();

  if (totalReviews === 0) {
    warnings.push(
      'No written reviews were available for this keyword, so the analysis relies on ratings and listing data only.',
    );
  }

  const marketStats = buildMarketStats({
    keyword: input.keyword,
    country: input.country,
    language: input.language,
    appsFound: candidates.length,
    competitors,
    reviewsAnalysed: totalReviews,
  });

  return { input, competitors, marketStats, reviewInsights, warnings };
}

// ---------------------------------------------------------------------------
// Token-controlled projection for the model
// ---------------------------------------------------------------------------

function trimBuckets(buckets: ThemeBucket[], limit: number) {
  return buckets.slice(0, limit).map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    percentage: bucket.percentage,
  }));
}

/**
 * Build the payload that actually goes to the model.
 *
 * Cost control is a design constraint, not an afterthought. A raw research
 * result is ~200KB of JSON (descriptions, screenshot URLs, hundreds of full
 * reviews). What the model needs is the *evidence*, already counted: the theme
 * histograms plus a bounded sample of verbatim quotes to ground them. That is
 * roughly 4-6K input tokens regardless of how many reviews were scraped.
 */
export function buildAnalysisPayload(research: ResearchResponse): AnalysisPayload {
  const { input, competitors, marketStats, reviewInsights } = research;

  return {
    input,
    marketStats,
    competitors: competitors.slice(0, 12).map((competitor) => ({
      title: competitor.title,
      developer: competitor.developer,
      installs: competitor.installs,
      minInstalls: competitor.minInstalls,
      score: competitor.score,
      ratingCount: competitor.ratingCount,
      free: competitor.free,
      priceText: competitor.priceText,
      offersIAP: competitor.offersIAP,
      adSupported: competitor.adSupported,
      genre: competitor.genre,
      updated: competitor.updated,
      summary: competitor.summary ? truncate(competitor.summary, 180) : undefined,
    })),
    complaints: trimBuckets(reviewInsights.complaints, 12),
    praise: trimBuckets(reviewInsights.praise, 8),
    featureRequests: trimBuckets(reviewInsights.featureRequests, 10),
    sampleNegativeReviews: reviewInsights.quotes.negative.slice(0, 20).map((q) => truncate(q.text, 160)),
    samplePositiveReviews: reviewInsights.quotes.positive.slice(0, 10).map((q) => truncate(q.text, 160)),
    sampleFeatureRequests: reviewInsights.quotes.featureRequests.slice(0, 15).map((q) => truncate(q.text, 160)),
  };
}

/** Convenience for the competitor-detail route, which needs one app only. */
export function findCompetitor(competitors: Competitor[], appId: string): Competitor | undefined {
  return competitors.find((competitor) => competitor.appId === appId);
}
