import { fail, ok, readJson } from '@/lib/api-response';
import { negativeReviewsRequestSchema } from '@/lib/api-schemas';
import { fetchNegativeReviews } from '@/lib/playstore/scrape';
import type { NegativeReviewsResponse } from '@/lib/types';

/**
 * POST /api/competitor/reviews
 *
 * Every negative review Play will give up for one app, newest first.
 *
 * Separate from the competitor deep dive because it is a different shape of
 * request: the deep dive is a quick sample that runs on page load, this walks
 * far more pages and is only worth paying for when a user asks to read the
 * complaints in full.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { appId, country, language } = negativeReviewsRequestSchema.parse(await readJson(request));

    const sweep = await fetchNegativeReviews({ appId, country, language });

    const payload: NegativeReviewsResponse = {
      appId,
      reviews: sweep.reviews,
      scanned: sweep.scanned,
      truncated: sweep.truncated,
    };
    return ok(payload);
  } catch (error) {
    return fail(error);
  }
}
