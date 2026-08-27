import type { Recommendation, ScoreSet } from '../types';

export interface RecommendationBand {
  value: Recommendation;
  label: string;
  /** Semantic status role - maps to the status palette, never to a series colour. */
  tone: 'good' | 'warning' | 'critical';
  description: string;
}

export const RECOMMENDATION_BANDS: Record<Recommendation, RecommendationBand> = {
  STRONG: {
    value: 'STRONG',
    label: 'Strong Opportunity',
    tone: 'good',
    description: 'Real demand, addressable competition and clear user pain. Worth building.',
  },
  MODERATE: {
    value: 'MODERATE',
    label: 'Moderate Opportunity',
    tone: 'warning',
    description: 'A viable niche exists, but it needs sharp differentiation to win.',
  },
  LOW: {
    value: 'LOW',
    label: 'Low Opportunity',
    tone: 'critical',
    description: 'Saturated, well-served, or too little pain to displace the incumbents.',
  },
};

/** Derive the traffic-light band from a 0-10 opportunity score. */
export function bandForScore(score: number): Recommendation {
  if (score >= 7) return 'STRONG';
  if (score >= 4.5) return 'MODERATE';
  return 'LOW';
}

export function bandOf(recommendation: Recommendation): RecommendationBand {
  return RECOMMENDATION_BANDS[recommendation] ?? RECOMMENDATION_BANDS.MODERATE;
}

export interface ScoreDescriptor {
  key: keyof ScoreSet;
  label: string;
  /** What a *high* value means, so the direction is never ambiguous. */
  highMeans: string;
  description: string;
}

/**
 * Note the direction on competition: a high competitionScore means competition
 * is *favourable* (weak or fragmented), not that there is a lot of it. Every
 * score in this app points the same way - higher is better - so the radar chart
 * and the progress bars are readable without a legend explaining polarity.
 */
export const SCORE_DESCRIPTORS: ScoreDescriptor[] = [
  {
    key: 'demandScore',
    label: 'Demand',
    highMeans: 'Lots of people actively looking for this',
    description: 'Install volume, review velocity and breadth of search interest.',
  },
  {
    key: 'competitionScore',
    label: 'Competition',
    highMeans: 'Incumbents are weak or fragmented',
    description: 'How beatable the current field is - higher means more room.',
  },
  {
    key: 'painScore',
    label: 'User Pain',
    highMeans: 'Users are visibly frustrated today',
    description: 'Severity and frequency of complaints in real reviews.',
  },
  {
    key: 'monetizationScore',
    label: 'Monetization',
    highMeans: 'Users already pay in this category',
    description: 'Evidence of willingness to pay and workable revenue models.',
  },
  {
    key: 'featureGapScore',
    label: 'Feature Gap',
    highMeans: 'Requested features nobody ships',
    description: 'Volume of repeatedly requested, unmet functionality.',
  },
];

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}

/** Normalise every score in a set into 0-10 with one decimal. */
export function clampScoreSet(scores: ScoreSet): ScoreSet {
  return {
    demandScore: clampScore(scores.demandScore),
    competitionScore: clampScore(scores.competitionScore),
    painScore: clampScore(scores.painScore),
    monetizationScore: clampScore(scores.monetizationScore),
    featureGapScore: clampScore(scores.featureGapScore),
    opportunityScore: clampScore(scores.opportunityScore),
  };
}
