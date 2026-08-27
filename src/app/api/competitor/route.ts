import type { NextRequest } from 'next/server';

import { fail, ok, readJson } from '@/lib/api-response';
import { competitorRequestSchema } from '@/lib/api-schemas';
import { AppError } from '@/lib/errors';
import { loadPlayScraper } from '@/lib/playstore/client';
import { toCompetitor } from '@/lib/playstore/normalize';
import { buildCompetitorReviewStats } from '@/lib/playstore/reviews';
import { fetchReviewsForCompetitors, fetchSimilarApps } from '@/lib/playstore/scrape';
import type { Competitor } from '@/lib/types';

/**
 * POST /api/competitor
 *
 * On-demand deep dive for a single app: fresh listing detail, its own review
 * roll-up, and Play's "similar apps". Used by the competitor detail page when a
 * user drills into an app that was not part of the original review sample.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const { appId, country, language, reviewCount } = competitorRequestSchema.parse(body);

    const gplay = await loadPlayScraper();

    let detail;
    try {
      detail = await gplay.app({ appId, country, lang: language });
    } catch (cause) {
      throw new AppError('NOT_FOUND', `Google Play has no listing for "${appId}" in this market.`, {
        hint: 'The app may be region-restricted or removed. Try a different country.',
        cause,
      });
    }

    const competitor: Competitor = toCompetitor({ ...detail, appId }, 1);

    const [{ reviewsByApp }, similarApps] = await Promise.all([
      fetchReviewsForCompetitors({
        competitors: [competitor],
        country,
        language,
        perApp: reviewCount,
      }),
      fetchSimilarApps({ appId, country, language }),
    ]);

    const reviews = reviewsByApp.get(appId) ?? [];
    if (reviews.length > 0) {
      competitor.reviewStats = buildCompetitorReviewStats(reviews, competitor.title);
    }
    competitor.similarApps = similarApps.filter((app) => app.appId !== appId);

    return ok({ competitor, reviewsAnalysed: reviews.length });
  } catch (error) {
    return fail(error);
  }
}

