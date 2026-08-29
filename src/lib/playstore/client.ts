import 'server-only';

import { AppError } from '../errors';

/**
 * `google-play-scraper` is a CommonJS package whose interop shape has moved
 * around between majors (`module.exports`, `exports.default`, and in some
 * bundler configurations `exports.default.default`). Rather than trust one of
 * them, we resolve the object that actually carries the API surface.
 *
 * We also declare only the slice of the API we use, so the app is not coupled
 * to the package's own (loose) type definitions.
 */

export interface GPlaySearchResult {
  appId: string;
  title: string;
  developer: string;
  developerId?: string;
  icon?: string;
  url?: string;
  summary?: string;
  score?: number;
  scoreText?: string;
  free?: boolean;
  price?: number;
  priceText?: string;
  currency?: string;
}

export interface GPlayAppDetail extends GPlaySearchResult {
  description?: string;
  descriptionHTML?: string;
  installs?: string;
  minInstalls?: number;
  maxInstalls?: number;
  ratings?: number;
  reviews?: number;
  histogram?: Record<string, number>;
  offersIAP?: boolean;
  IAPRange?: string;
  adSupported?: boolean;
  genre?: string;
  genreId?: string;
  contentRating?: string;
  androidVersion?: string;
  androidVersionText?: string;
  version?: string;
  updated?: number;
  released?: string;
  screenshots?: string[];
  headerImage?: string;
  developerWebsite?: string;
  developerEmail?: string;
  developerAddress?: string;
  developerLegalName?: string;
  privacyPolicy?: string;
  recentChanges?: string;
  contentRatingDescription?: string;
  categories?: Array<{ name?: string; id?: string } | null>;
  video?: string;
  videoImage?: string;
  androidMaxVersion?: string;
  originalPrice?: number;
  available?: boolean;
  preregister?: boolean;
  earlyAccessEnabled?: boolean;
  isAvailableInPlayPass?: boolean;
}

/** Play's "Data safety" panel, as the scraper returns it. */
export interface GPlayDataSafety {
  sharedData?: Array<{ data?: string; type?: string; purpose?: string; optional?: boolean } | null>;
  collectedData?: Array<{ data?: string; type?: string; purpose?: string; optional?: boolean } | null>;
  securityPractices?: Array<{ practice?: string; description?: string } | null>;
  privacyPolicyUrl?: string;
}

export interface GPlayReview {
  id?: string;
  userName?: string;
  date?: string;
  score?: number;
  scoreText?: string;
  title?: string;
  text?: string;
  thumbsUp?: number;
  version?: string;
  replyText?: string;
}

export interface GPlayApi {
  search(options: {
    term: string;
    num?: number;
    country?: string;
    lang?: string;
    fullDetail?: boolean;
    price?: 'all' | 'free' | 'paid';
    throttle?: number;
  }): Promise<GPlaySearchResult[]>;

  app(options: {
    appId: string;
    country?: string;
    lang?: string;
    throttle?: number;
  }): Promise<GPlayAppDetail>;

  reviews(options: {
    appId: string;
    country?: string;
    lang?: string;
    sort?: number;
    num?: number;
    paginate?: boolean;
    nextPaginationToken?: string | null;
    throttle?: number;
  }): Promise<{ data: GPlayReview[]; nextPaginationToken?: string | null } | GPlayReview[]>;

  similar(options: {
    appId: string;
    country?: string;
    lang?: string;
    fullDetail?: boolean;
  }): Promise<GPlaySearchResult[]>;

  // The three below are served by Play's batchexecute endpoint rather than the
  // listing HTML, so they are declared optional: they are the first things to
  // disappear when Google reshuffles that API, and every caller treats a
  // missing method the same way it treats a failed one.
  permissions?(options: {
    appId: string;
    country?: string;
    lang?: string;
    short?: boolean;
    throttle?: number;
  }): Promise<Array<{ permission?: string; type?: string } | null>>;

  datasafety?(options: {
    appId: string;
    country?: string;
    lang?: string;
    throttle?: number;
  }): Promise<GPlayDataSafety>;

  developer?(options: {
    devId: string;
    country?: string;
    lang?: string;
    num?: number;
    fullDetail?: boolean;
    throttle?: number;
  }): Promise<GPlaySearchResult[]>;

  sort: { NEWEST: number; RATING: number; HELPFULNESS: number };
}

let cached: GPlayApi | null = null;

function unwrap(candidate: unknown): unknown {
  let current = candidate;
  // Walk at most three levels of `.default` nesting.
  for (let depth = 0; depth < 3; depth += 1) {
    if (current && typeof (current as GPlayApi).search === 'function') return current;
    const next = (current as { default?: unknown } | null)?.default;
    if (!next) break;
    current = next;
  }
  return current;
}

export async function loadPlayScraper(): Promise<GPlayApi> {
  if (cached) return cached;

  let mod: unknown;
  try {
    mod = await import('google-play-scraper');
  } catch (cause) {
    throw new AppError('SCRAPER_UNAVAILABLE', 'Could not load the Google Play scraper module.', {
      hint: 'Run `npm install` so that google-play-scraper is available on the server.',
      cause,
    });
  }

  const api = unwrap(mod) as GPlayApi | undefined;
  if (!api || typeof api.search !== 'function' || typeof api.app !== 'function') {
    throw new AppError('SCRAPER_UNAVAILABLE', 'The Google Play scraper module has an unexpected shape.', {
      hint: 'Reinstall google-play-scraper, or pin it to a v10 release.',
    });
  }

  cached = api;
  return api;
}

/** Reviews come back either as a bare array or as `{ data, nextPaginationToken }`. */
export function unwrapReviews(
  result: { data: GPlayReview[]; nextPaginationToken?: string | null } | GPlayReview[],
): { data: GPlayReview[]; nextPaginationToken?: string | null } {
  if (Array.isArray(result)) return { data: result, nextPaginationToken: null };
  return { data: result?.data ?? [], nextPaginationToken: result?.nextPaginationToken ?? null };
}
