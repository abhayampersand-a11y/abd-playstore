import type { NextRequest } from 'next/server';

import { fail, ok, readJson } from '@/lib/api-response';
import { competitorExtrasRequestSchema } from '@/lib/api-schemas';
import { AppError } from '@/lib/errors';
import { loadPlayScraper } from '@/lib/playstore/client';
import { toCompetitor } from '@/lib/playstore/normalize';
import { fetchListingExtras } from '@/lib/playstore/scrape';
import type { CompetitorDossier } from '@/lib/types';

/**
 * POST /api/competitor/extras
 *
 * Everything the Play listing carries that the research pipeline does not keep
 * per competitor: permissions, the data-safety table, the developer's other
 * apps, and Play's own "similar apps".
 *
 * The listing itself is re-scraped rather than read from the stored record, so
 * a research run saved before one of these fields existed still shows it - and
 * so "What's new" is current rather than however it read on the research date.
 *
 * No reviews here: this is the cheap lookup the detail page runs on open, while
 * POST /api/competitor stays the expensive, explicit deep dive.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const { appId, country, language } = competitorExtrasRequestSchema.parse(body);

    const gplay = await loadPlayScraper();

    let detail;
    try {
      detail = await gplay.app({ appId, country, lang: language, throttle: 10 });
    } catch (cause) {
      throw new AppError('NOT_FOUND', `Google Play has no listing for "${appId}" in this market.`, {
        hint: 'The app may be region-restricted or removed. Try a different country.',
        cause,
      });
    }

    const competitor = toCompetitor({ ...detail, appId }, 1);
    const extras = await fetchListingExtras({
      appId,
      country,
      language,
      developerId: competitor.developerId,
    });

    const dossier: CompetitorDossier = {
      competitor: {
        ...competitor,
        permissions: extras.permissions,
        dataSafety: extras.dataSafety,
        developerApps: extras.developerApps,
        similarApps: extras.similarApps,
      },
      unavailable: extras.unavailable,
    };

    return ok(dossier);
  } catch (error) {
    return fail(error);
  }
}
