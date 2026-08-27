import type { Competitor, CompetitorSummary, MarketStats, RatingHistogram } from '../types';
import type { GPlayAppDetail, GPlaySearchResult } from './client';
import { daysSince } from '../format';

const EMPTY_HISTOGRAM: RatingHistogram = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

export function emptyHistogram(): RatingHistogram {
  return { ...EMPTY_HISTOGRAM };
}

function toIsoDate(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeHistogram(raw: Record<string, number> | undefined): RatingHistogram | undefined {
  if (!raw) return undefined;
  const histogram: RatingHistogram = emptyHistogram();
  let total = 0;
  (['1', '2', '3', '4', '5'] as const).forEach((star) => {
    const value = Number(raw[star] ?? 0);
    const safe = Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
    histogram[star] = safe;
    total += safe;
  });
  return total > 0 ? histogram : undefined;
}

/** Strip the Play Store description down to something a human can skim. */
export function cleanDescription(text: string | undefined, maxLength = 2200): string | undefined {
  if (!text) return undefined;
  const normalized = text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trimEnd()}…` : normalized;
}

export function toCompetitorSummary(raw: GPlaySearchResult): CompetitorSummary {
  return {
    appId: raw.appId,
    title: raw.title?.trim() || raw.appId,
    developer: raw.developer?.trim() || 'Unknown developer',
    developerId: raw.developerId,
    icon: raw.icon,
    url: raw.url,
    summary: raw.summary?.trim(),
    score: typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : undefined,
    free: raw.free ?? (raw.price ?? 0) === 0,
    priceText: raw.priceText,
    currency: raw.currency,
  };
}

export function toCompetitor(raw: GPlayAppDetail, rank: number): Competitor {
  return {
    ...toCompetitorSummary(raw),
    rank,
    ratingCount: numberOrUndefined(raw.ratings),
    reviewCount: numberOrUndefined(raw.reviews),
    installs: raw.installs,
    minInstalls: numberOrUndefined(raw.minInstalls),
    maxInstalls: numberOrUndefined(raw.maxInstalls),
    histogram: normalizeHistogram(raw.histogram),
    offersIAP: Boolean(raw.offersIAP),
    iapRange: raw.IAPRange,
    adSupported: Boolean(raw.adSupported),
    genre: raw.genre,
    genreId: raw.genreId,
    contentRating: raw.contentRating,
    androidVersion: raw.androidVersionText || raw.androidVersion,
    version: raw.version,
    updated: toIsoDate(raw.updated),
    released: raw.released,
    description: cleanDescription(raw.description),
    // Six screenshots is enough for the detail gallery and keeps the record small.
    screenshots: (raw.screenshots ?? []).filter(Boolean).slice(0, 6),
    headerImage: raw.headerImage,
    developerWebsite: raw.developerWebsite,
    privacyPolicy: raw.privacyPolicy,
  };
}

function numberOrUndefined(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Remove duplicates. Play search regularly returns the same app twice (regional
 * listings) and near-identical clones from one developer; we keep the first
 * occurrence, which is also the highest-ranked one.
 */
export function dedupeApps<T extends { appId: string; title: string; developer: string }>(
  apps: T[],
): T[] {
  const seenIds = new Set<string>();
  const seenTitleDev = new Set<string>();
  const result: T[] = [];

  for (const app of apps) {
    if (!app?.appId) continue;
    const idKey = app.appId.toLowerCase();
    if (seenIds.has(idKey)) continue;

    const titleDevKey = `${normalizeTitle(app.title)}::${app.developer.toLowerCase().trim()}`;
    if (seenTitleDev.has(titleDevKey)) continue;

    seenIds.add(idKey);
    seenTitleDev.add(titleDevKey);
    result.push(app);
  }
  return result;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(free|pro|premium|plus|lite|app|hd|20\d\d)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rank apps by how informative they are as competitors, not by raw popularity:
 * a well-installed app with a mediocre rating tells us more about an unmet need
 * than a tiny app with five 5-star reviews.
 */
export function scoreCompetitorRelevance(app: Competitor): number {
  const installs = app.minInstalls ?? 0;
  const reach = Math.log10(Math.max(installs, 1)); // 0..9
  const ratingVolume = Math.log10(Math.max(app.ratingCount ?? 0, 1)); // 0..8
  // Apps rated 3.2-4.3 are the interesting middle: enough users to matter,
  // enough dissatisfaction to leave a gap.
  const ratingSignal = app.score === undefined ? 0.5 : 1 - Math.abs(app.score - 3.8) / 2.2;
  const freshness = (() => {
    const age = daysSince(app.updated);
    if (age === undefined) return 0.5;
    if (age <= 90) return 1;
    if (age <= 365) return 0.7;
    return 0.35;
  })();

  return reach * 1.6 + ratingVolume * 1.2 + Math.max(ratingSignal, 0) * 2.5 + freshness * 1.2;
}

/** Pick the competitors worth spending review requests on. */
export function selectImportantCompetitors(competitors: Competitor[], limit: number): Competitor[] {
  return [...competitors]
    .sort((a, b) => scoreCompetitorRelevance(b) - scoreCompetitorRelevance(a))
    .slice(0, Math.max(1, limit));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

function share(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function buildMarketStats(params: {
  keyword: string;
  country: string;
  language: string;
  appsFound: number;
  competitors: Competitor[];
  reviewsAnalysed: number;
}): MarketStats {
  const { competitors } = params;
  const total = competitors.length;
  const ratings = competitors.map((c) => c.score).filter((s): s is number => typeof s === 'number');

  const histogram = emptyHistogram();
  for (const competitor of competitors) {
    if (!competitor.histogram) continue;
    (['1', '2', '3', '4', '5'] as const).forEach((star) => {
      histogram[star] += competitor.histogram?.[star] ?? 0;
    });
  }

  const maintained = competitors.filter((c) => {
    const age = daysSince(c.updated);
    return age !== undefined && age <= 180;
  }).length;

  return {
    keyword: params.keyword,
    country: params.country,
    language: params.language,
    appsFound: params.appsFound,
    competitorsAnalysed: total,
    reviewsAnalysed: params.reviewsAnalysed,
    averageRating:
      ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : 0,
    medianRating: Math.round(median(ratings) * 100) / 100,
    totalMinInstalls: competitors.reduce((sum, c) => sum + (c.minInstalls ?? 0), 0),
    freeShare: share(competitors.filter((c) => c.free).length, total),
    iapShare: share(competitors.filter((c) => c.offersIAP).length, total),
    adShare: share(competitors.filter((c) => c.adSupported).length, total),
    activelyMaintainedShare: share(maintained, total),
    distinctDevelopers: new Set(competitors.map((c) => c.developer.toLowerCase())).size,
    histogram,
  };
}
