import type {
  CleanReview,
  Competitor,
  CompetitorReviewStats,
  RatingHistogram,
  ReviewInsights,
  ReviewQuote,
  SentimentSplit,
  ThemeBucket,
} from '../types';
import { sliceText } from '../format';
import type { GPlayReview } from './client';
import { emptyHistogram } from './normalize';
import { COMPLAINT_THEMES, FEATURE_REQUEST_THEMES, PRAISE_THEMES, REQUEST_SIGNALS, type Theme } from './themes';

const MIN_REVIEW_LENGTH = 15;
const MAX_REVIEW_LENGTH = 400;
const MAX_QUOTE_LENGTH = 220;

// ---------------------------------------------------------------------------
// Cleaning
// ---------------------------------------------------------------------------

/**
 * Normalise, filter and de-duplicate raw Play reviews.
 *
 * Play returns a lot of noise: one-word reviews ("good"), copy-pasted spam, and
 * reviews whose text is only emoji. None of that carries signal, and all of it
 * costs tokens downstream, so it is dropped here rather than later.
 */
export function cleanReviews(appId: string, raw: GPlayReview[]): CleanReview[] {
  const seen = new Set<string>();
  const cleaned: CleanReview[] = [];

  for (const review of raw) {
    const score = Number(review.score);
    if (!Number.isFinite(score) || score < 1 || score > 5) continue;

    const combined = [review.title, review.text].filter(Boolean).join('. ');
    const text = normalizeText(combined);
    if (text.length < MIN_REVIEW_LENGTH) continue;
    if (!/[a-z]{3}/i.test(text)) continue; // emoji-only or numeric noise

    const fingerprint = text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 90);
    if (fingerprint.length < 10 || seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    cleaned.push({
      appId,
      score: Math.round(score),
      text: text.length > MAX_REVIEW_LENGTH ? `${sliceText(text, MAX_REVIEW_LENGTH).trimEnd()}…` : text,
      date: toIso(review.date),
      thumbsUp: Number.isFinite(Number(review.thumbsUp)) ? Number(review.thumbsUp) : 0,
      version: review.version ?? undefined,
    });
  }

  return cleaned;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(.)\1{4,}/g, '$1$1$1') // "sooooo goooood" -> "sooo gooo"
    .trim();
}

function toIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export function sentimentOf(score: number): 'positive' | 'neutral' | 'negative' {
  if (score <= 2) return 'negative';
  if (score === 3) return 'neutral';
  return 'positive';
}

export function splitBySentiment(reviews: CleanReview[]): {
  positive: CleanReview[];
  neutral: CleanReview[];
  negative: CleanReview[];
} {
  const positive: CleanReview[] = [];
  const neutral: CleanReview[] = [];
  const negative: CleanReview[] = [];
  for (const review of reviews) {
    if (review.score <= 2) negative.push(review);
    else if (review.score === 3) neutral.push(review);
    else positive.push(review);
  }
  return { positive, neutral, negative };
}

export function histogramOf(reviews: CleanReview[]): RatingHistogram {
  const histogram = emptyHistogram();
  for (const review of reviews) {
    const key = String(Math.min(5, Math.max(1, review.score))) as keyof RatingHistogram;
    histogram[key] += 1;
  }
  return histogram;
}

export function sentimentSplitOf(reviews: CleanReview[]): SentimentSplit {
  const { positive, neutral, negative } = splitBySentiment(reviews);
  return { positive: positive.length, neutral: neutral.length, negative: negative.length };
}

// ---------------------------------------------------------------------------
// Theme extraction
// ---------------------------------------------------------------------------

function matchesTheme(theme: Theme, text: string): boolean {
  return theme.patterns.some((pattern) => pattern.test(text));
}

/**
 * Count how many of `reviews` mention each theme. Percentages are expressed as
 * a share of `reviews.length`, so "31%" reads as "31% of the negative reviews
 * we analysed mention advertising".
 */
export function extractThemes(themes: Theme[], reviews: CleanReview[], maxBuckets = 10): ThemeBucket[] {
  const total = reviews.length;
  if (total === 0) return [];

  const buckets = themes.map<ThemeBucket>((theme) => ({
    id: theme.id,
    label: theme.label,
    count: 0,
    percentage: 0,
    examples: [],
  }));

  reviews.forEach((review) => {
    themes.forEach((theme, index) => {
      if (!matchesTheme(theme, review.text)) return;
      const bucket = buckets[index];
      if (!bucket) return;
      bucket.count += 1;
      if (bucket.examples.length < 3) {
        bucket.examples.push(shortQuote(review.text));
      }
    });
  });

  return buckets
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => ({ ...bucket, percentage: round1((bucket.count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxBuckets);
}

/** Isolate the request-shaped sentences inside a review. */
export function extractRequestText(text: string): string | null {
  const sentences = text.split(/(?<=[.!?;])\s+/);
  const requestSentences = sentences.filter((sentence) =>
    REQUEST_SIGNALS.some((signal) => signal.test(sentence)),
  );
  if (requestSentences.length === 0) return null;
  return requestSentences.join(' ').trim();
}

/**
 * Feature requests are mined from every polarity - a 5-star review saying "love
 * it, please add PDF export" is the single strongest gap signal there is.
 */
export function extractFeatureRequests(reviews: CleanReview[]): {
  buckets: ThemeBucket[];
  quotes: ReviewQuote[];
  matchedReviews: CleanReview[];
} {
  const matched: CleanReview[] = [];
  const quotes: ReviewQuote[] = [];

  for (const review of reviews) {
    const requestText = extractRequestText(review.text);
    if (!requestText) continue;
    matched.push({ ...review, text: requestText });
    quotes.push({
      appId: review.appId,
      score: review.score,
      text: shortQuote(requestText),
      date: review.date,
      thumbsUp: review.thumbsUp,
    });
  }

  return {
    buckets: extractThemes(FEATURE_REQUEST_THEMES, matched, 10),
    quotes: quotes.sort((a, b) => (b.thumbsUp ?? 0) - (a.thumbsUp ?? 0)).slice(0, 40),
    matchedReviews: matched,
  };
}

function shortQuote(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_QUOTE_LENGTH ? `${sliceText(trimmed, MAX_QUOTE_LENGTH).trimEnd()}…` : trimmed;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Per-app roll-up
// ---------------------------------------------------------------------------

function toQuote(review: CleanReview, appTitle?: string): ReviewQuote {
  return {
    appId: review.appId,
    appTitle,
    score: review.score,
    text: shortQuote(review.text),
    date: review.date,
    thumbsUp: review.thumbsUp,
  };
}

/** Prefer reviews other users found helpful, then longer (more specific) ones. */
function rankQuotes(reviews: CleanReview[]): CleanReview[] {
  return [...reviews].sort((a, b) => {
    const helpful = (b.thumbsUp ?? 0) - (a.thumbsUp ?? 0);
    if (helpful !== 0) return helpful;
    return b.text.length - a.text.length;
  });
}

export function buildCompetitorReviewStats(
  reviews: CleanReview[],
  appTitle?: string,
): CompetitorReviewStats {
  const { positive, negative } = splitBySentiment(reviews);
  const requests = extractFeatureRequests(reviews);
  const averageScore =
    reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length : 0;

  return {
    analysed: reviews.length,
    averageScore: Math.round(averageScore * 100) / 100,
    sentiment: sentimentSplitOf(reviews),
    histogram: histogramOf(reviews),
    complaints: extractThemes(COMPLAINT_THEMES, negative, 8),
    praise: extractThemes(PRAISE_THEMES, positive, 8),
    topNegative: rankQuotes(negative).slice(0, 5).map((review) => toQuote(review, appTitle)),
    topPositive: rankQuotes(positive).slice(0, 5).map((review) => toQuote(review, appTitle)),
    featureRequests: requests.quotes.slice(0, 5).map((quote) => ({ ...quote, appTitle })),
  };
}

// ---------------------------------------------------------------------------
// Cross-app roll-up
// ---------------------------------------------------------------------------

export function buildReviewInsights(
  reviewsByApp: Map<string, CleanReview[]>,
  competitors: Competitor[],
): ReviewInsights {
  const titleByAppId = new Map(competitors.map((competitor) => [competitor.appId, competitor.title]));
  const all: CleanReview[] = [];
  for (const reviews of reviewsByApp.values()) all.push(...reviews);

  const { positive, neutral, negative } = splitBySentiment(all);
  const requests = extractFeatureRequests(all);

  const perApp = [...reviewsByApp.entries()]
    .filter(([, reviews]) => reviews.length > 0)
    .map(([appId, reviews]) => {
      const split = splitBySentiment(reviews);
      const average = reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length;
      return {
        appId,
        title: titleByAppId.get(appId) ?? appId,
        averageScore: Math.round(average * 100) / 100,
        analysed: reviews.length,
        negativeShare: round1((split.negative.length / reviews.length) * 100),
      };
    })
    .sort((a, b) => b.analysed - a.analysed);

  const withTitle = (review: CleanReview): ReviewQuote => toQuote(review, titleByAppId.get(review.appId));

  return {
    reviewsAnalysed: all.length,
    negativeReviews: negative.length,
    positiveReviews: positive.length,
    neutralReviews: neutral.length,
    sentiment: { positive: positive.length, neutral: neutral.length, negative: negative.length },
    histogram: histogramOf(all),
    complaints: extractThemes(COMPLAINT_THEMES, negative, 12),
    praise: extractThemes(PRAISE_THEMES, positive, 10),
    featureRequests: requests.buckets,
    quotes: {
      negative: rankQuotes(negative).slice(0, 24).map(withTitle),
      positive: rankQuotes(positive).slice(0, 16).map(withTitle),
      featureRequests: requests.quotes
        .slice(0, 24)
        .map((quote) => ({ ...quote, appTitle: titleByAppId.get(quote.appId) })),
    },
    perApp,
  };
}

/** An empty, renderable insights object - used when no reviews could be found. */
export function emptyReviewInsights(): ReviewInsights {
  return {
    reviewsAnalysed: 0,
    negativeReviews: 0,
    positiveReviews: 0,
    neutralReviews: 0,
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    histogram: emptyHistogram(),
    complaints: [],
    praise: [],
    featureRequests: [],
    quotes: { negative: [], positive: [], featureRequests: [] },
    perApp: [],
  };
}
