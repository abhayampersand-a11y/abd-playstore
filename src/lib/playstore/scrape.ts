import 'server-only';

import { AppError, toAppError } from '../errors';
import type {
  AppPermission,
  CleanReview,
  Competitor,
  CompetitorSummary,
  DataSafetyReport,
} from '../types';
import { loadPlayScraper, unwrapReviews, type GPlayReview } from './client';
import { cleanReviews } from './reviews';
import {
  dedupeApps,
  toCompetitor,
  toCompetitorSummary,
  toDataSafety,
  toPermissions,
} from './normalize';

/** Play throttles hard; three concurrent requests is the sweet spot. */
const CONCURRENCY = 3;
const CALL_TIMEOUT_MS = 20_000;

/** Reject a promise that outlives `ms`, so one hung request cannot stall a run. */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AppError('TIMEOUT', `${label} timed out after ${ms / 1000}s.`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Run `worker` over `items` with a bounded number of in-flight requests. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return;
      results[index] = await worker(item, index);
    }
  });

  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchApps(params: {
  keyword: string;
  country: string;
  language: string;
  limit: number;
}): Promise<CompetitorSummary[]> {
  const gplay = await loadPlayScraper();

  let raw;
  try {
    raw = await withTimeout(
      gplay.search({
        term: params.keyword,
        // Over-fetch so that de-duplication still leaves us enough candidates.
        num: Math.min(60, Math.max(params.limit * 3, 20)),
        country: params.country,
        lang: params.language,
        fullDetail: false,
        throttle: 10,
      }),
      CALL_TIMEOUT_MS,
      'Google Play search',
    );
  } catch (error) {
    throw wrapPlayError(error, `searching Google Play for "${params.keyword}"`);
  }

  const summaries = dedupeApps((raw ?? []).map(toCompetitorSummary));

  if (summaries.length === 0) {
    throw new AppError('NO_APPS_FOUND', `No Google Play apps matched "${params.keyword}".`, {
      hint: 'Try a broader keyword, or a larger market such as United States.',
    });
  }

  return summaries;
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export interface DetailResult {
  competitors: Competitor[];
  warnings: string[];
}

export async function fetchCompetitorDetails(params: {
  candidates: CompetitorSummary[];
  country: string;
  language: string;
  limit: number;
}): Promise<DetailResult> {
  const gplay = await loadPlayScraper();
  const targets = params.candidates.slice(0, params.limit);
  const warnings: string[] = [];

  const settled = await mapWithConcurrency(targets, CONCURRENCY, async (candidate, index) => {
    try {
      const detail = await withTimeout(
        gplay.app({ appId: candidate.appId, country: params.country, lang: params.language, throttle: 10 }),
        CALL_TIMEOUT_MS,
        `Fetching ${candidate.title}`,
      );
      return toCompetitor({ ...detail, appId: candidate.appId }, index + 1);
    } catch {
      // A single unavailable listing must not fail the whole research run.
      warnings.push(`Could not load full details for "${candidate.title}".`);
      return null;
    }
  });

  const competitors = settled.filter((entry): entry is Competitor => entry !== null);

  if (competitors.length === 0) {
    throw new AppError('PLAY_STORE_ERROR', 'Google Play returned no usable app details.', {
      hint: 'Play is likely throttling this IP. Wait a minute and run the research again.',
    });
  }

  // Re-rank so the numbering is contiguous after any drop-outs.
  competitors.forEach((competitor, index) => {
    competitor.rank = index + 1;
  });

  return { competitors, warnings };
}

/** Best-effort "similar apps" lookup for the competitor detail page. */
export async function fetchSimilarApps(params: {
  appId: string;
  country: string;
  language: string;
  limit?: number;
}): Promise<CompetitorSummary[]> {
  try {
    const gplay = await loadPlayScraper();
    const raw = await withTimeout(
      gplay.similar({ appId: params.appId, country: params.country, lang: params.language, fullDetail: false }),
      CALL_TIMEOUT_MS,
      'Fetching similar apps',
    );
    return dedupeApps((raw ?? []).map(toCompetitorSummary)).slice(0, params.limit ?? 8);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Listing extras
// ---------------------------------------------------------------------------

export interface ListingExtras {
  permissions: AppPermission[];
  dataSafety?: DataSafetyReport;
  developerApps: CompetitorSummary[];
  similarApps: CompetitorSummary[];
  /** Labels of the lookups Play would not answer, for the UI to own up to. */
  unavailable: string[];
}

/**
 * Everything Play knows about one app beyond its listing metrics: what it may
 * touch on the device, what it does with the data, what else its developer
 * ships, and what Play considers comparable.
 *
 * All four come from endpoints that Google changes without notice, and three of
 * them are simply absent for some apps, so each is attempted independently: a
 * failure costs that one panel, never the page. `unavailable` carries the
 * failures so the UI can say "Play did not answer" instead of "none".
 */
export async function fetchListingExtras(params: {
  appId: string;
  country: string;
  language: string;
  developerId?: string;
}): Promise<ListingExtras> {
  const gplay = await loadPlayScraper();
  const unavailable: string[] = [];
  const options = { appId: params.appId, country: params.country, lang: params.language, throttle: 10 };

  async function attempt<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
    try {
      return await withTimeout(run(), CALL_TIMEOUT_MS, label);
    } catch {
      unavailable.push(label);
      return fallback;
    }
  }

  const [permissions, dataSafety, developerApps, similarApps] = await Promise.all([
    attempt<AppPermission[]>('Permissions', [], async () => {
      if (!gplay.permissions) throw new AppError('SCRAPER_UNAVAILABLE', 'permissions() is missing.');
      return toPermissions(await gplay.permissions({ ...options, short: false }));
    }),

    attempt<DataSafetyReport | undefined>('Data safety', undefined, async () => {
      if (!gplay.datasafety) throw new AppError('SCRAPER_UNAVAILABLE', 'datasafety() is missing.');
      return toDataSafety(await gplay.datasafety(options));
    }),

    attempt<CompetitorSummary[]>('Developer catalogue', [], async () => {
      // Play only answers this for numeric developer ids; the older name-based
      // ones ("Dropbox,+Inc.") 404, which is a missing panel, not an error.
      if (!gplay.developer || !params.developerId) return [];
      const raw = await gplay.developer({
        devId: params.developerId,
        country: params.country,
        lang: params.language,
        num: 24,
        fullDetail: false,
      });
      return dedupeApps((raw ?? []).map(toCompetitorSummary))
        .filter((app) => app.appId !== params.appId)
        .slice(0, 12);
    }),

    attempt<CompetitorSummary[]>('Similar apps', [], async () => {
      const raw = await gplay.similar({
        appId: params.appId,
        country: params.country,
        lang: params.language,
        fullDetail: false,
      });
      return dedupeApps((raw ?? []).map(toCompetitorSummary))
        .filter((app) => app.appId !== params.appId)
        .slice(0, 8);
    }),
  ]);

  return { permissions, dataSafety, developerApps, similarApps, unavailable };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface ReviewFetchResult {
  reviewsByApp: Map<string, CleanReview[]>;
  warnings: string[];
}

/**
 * Reviews are fetched newest-first: a two-year-old complaint about a bug that
 * has since been fixed is actively misleading when you are sizing a gap today.
 */
export async function fetchReviewsForCompetitors(params: {
  competitors: Competitor[];
  country: string;
  language: string;
  perApp: number;
}): Promise<ReviewFetchResult> {
  const gplay = await loadPlayScraper();
  const reviewsByApp = new Map<string, CleanReview[]>();
  const warnings: string[] = [];

  await mapWithConcurrency(params.competitors, CONCURRENCY, async (competitor) => {
    try {
      const raw = await fetchReviewPages(gplay, {
        appId: competitor.appId,
        country: params.country,
        language: params.language,
        target: params.perApp,
      });
      const cleaned = cleanReviews(competitor.appId, raw);
      if (cleaned.length === 0) {
        warnings.push(`"${competitor.title}" has no usable written reviews in this language.`);
      }
      reviewsByApp.set(competitor.appId, cleaned);
    } catch {
      warnings.push(`Could not collect reviews for "${competitor.title}".`);
      reviewsByApp.set(competitor.appId, []);
    }
  });

  return { reviewsByApp, warnings };
}

async function fetchReviewPages(
  gplay: Awaited<ReturnType<typeof loadPlayScraper>>,
  params: { appId: string; country: string; language: string; target: number },
): Promise<GPlayReview[]> {
  const collected: GPlayReview[] = [];
  let token: string | null | undefined = null;

  // Play caps a page at ~150; loop until we hit the target or run out of pages.
  for (let page = 0; page < 4 && collected.length < params.target; page += 1) {
    const response = await withTimeout(
      gplay.reviews({
        appId: params.appId,
        country: params.country,
        lang: params.language,
        sort: gplay.sort?.NEWEST ?? 2,
        num: Math.min(150, params.target - collected.length),
        paginate: true,
        nextPaginationToken: token ?? undefined,
        throttle: 10,
      }),
      CALL_TIMEOUT_MS,
      'Fetching reviews',
    );

    const { data, nextPaginationToken } = unwrapReviews(response);
    if (data.length === 0) break;
    collected.push(...data);
    token = nextPaginationToken;
    if (!token) break;
  }

  return collected.slice(0, params.target);
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function wrapPlayError(error: unknown, context: string): AppError {
  const appError = toAppError(error);
  if (appError.code !== 'UNKNOWN') return appError;

  const message = appError.message.toLowerCase();
  if (message.includes('404') || message.includes('not found')) {
    return new AppError('NO_APPS_FOUND', `Google Play returned nothing while ${context}.`, { cause: error });
  }
  if (message.includes('429') || message.includes('too many requests')) {
    return new AppError('RATE_LIMITED', 'Google Play is rate limiting this server.', {
      hint: 'Wait about a minute before running another research.',
      cause: error,
    });
  }
  return new AppError('PLAY_STORE_ERROR', `Google Play request failed while ${context}.`, { cause: error });
}

// ---------------------------------------------------------------------------
// Every negative review for one app
// ---------------------------------------------------------------------------

/**
 * Play offers no way to ask for "only the 1 and 2 star reviews".
 *
 * `sort.RATING` returns the *highest* rated first, so it is worse than useless
 * here; the only route to the negatives is to page through reviews newest-first
 * and filter locally. That is affordable - a page of 150 comes back in roughly
 * 300ms - but it is unbounded on a very large app, so the walk is capped by
 * both a page count and a wall-clock budget and reports when it stopped early.
 *
 * Those caps bind on essentially every app. Play keeps serving fresh pages long
 * past the review count shown on the listing - measured on a listing claiming
 * 277 reviews, 1,800 pages in were still unique - so the honest promise is
 * "every negative review in the most recent few thousand", not "every negative
 * review ever written", and the UI says so.
 */
export interface NegativeReviewSweep {
  reviews: CleanReview[];
  /** Raw reviews read to find them, negative or not. */
  scanned: number;
  /** True when a cap stopped the walk before Play ran out of pages. */
  truncated: boolean;
}

const SWEEP_MAX_PAGES = 25;
const SWEEP_BUDGET_MS = 30_000;
const SWEEP_PAGE_SIZE = 150;

export async function fetchNegativeReviews(params: {
  appId: string;
  country: string;
  language: string;
}): Promise<NegativeReviewSweep> {
  const gplay = await loadPlayScraper();
  const startedAt = Date.now();

  const raw: GPlayReview[] = [];
  let token: string | null | undefined = null;
  let truncated = false;

  for (let page = 0; page < SWEEP_MAX_PAGES; page += 1) {
    if (Date.now() - startedAt > SWEEP_BUDGET_MS) {
      truncated = true;
      break;
    }

    const response = await withTimeout(
      gplay.reviews({
        appId: params.appId,
        country: params.country,
        lang: params.language,
        sort: gplay.sort?.NEWEST ?? 2,
        num: SWEEP_PAGE_SIZE,
        paginate: true,
        nextPaginationToken: token ?? undefined,
        throttle: 10,
      }),
      CALL_TIMEOUT_MS,
      'Fetching reviews',
    );

    const { data, nextPaginationToken } = unwrapReviews(response);
    if (data.length === 0) break;
    raw.push(...data);

    token = nextPaginationToken;
    // No token means Play has no more pages - the sweep is genuinely complete.
    if (!token) break;

    // Ran out of pages budget rather than out of reviews.
    if (page === SWEEP_MAX_PAGES - 1) truncated = true;
  }

  // Clean once, over everything: de-duplication has to see the whole set, and
  // the same filters that protect the analysis pipeline apply here too.
  const cleaned = cleanReviews(params.appId, raw);

  return {
    reviews: cleaned.filter((review) => review.score <= 2),
    scanned: raw.length,
    truncated,
  };
}
