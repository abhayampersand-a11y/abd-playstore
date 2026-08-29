import { z } from 'zod';

import { researchInputSchema } from './validation';

/**
 * Request-body schemas for the AI-backed routes.
 *
 * These validate the fields the server actually reads rather than restating the
 * entire domain model - the research dataset is produced by our own pipeline,
 * so the goal here is to reject a malformed or hand-crafted body cheaply, not
 * to re-derive every type. Unknown keys are allowed through and ignored.
 */

const themeBucketSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    count: z.number(),
    percentage: z.number(),
    examples: z.array(z.string()).default([]),
  })
  .passthrough();

const quoteSchema = z
  .object({
    appId: z.string(),
    appTitle: z.string().optional(),
    score: z.number(),
    text: z.string(),
  })
  .passthrough();

const histogramSchema = z.object({
  '1': z.number(),
  '2': z.number(),
  '3': z.number(),
  '4': z.number(),
  '5': z.number(),
});

const competitorSchema = z
  .object({
    appId: z.string(),
    title: z.string(),
    developer: z.string(),
    rank: z.number().optional(),
    free: z.boolean(),
    offersIAP: z.boolean(),
    adSupported: z.boolean(),
    screenshots: z.array(z.string()).default([]),
  })
  .passthrough();

const marketStatsSchema = z
  .object({
    keyword: z.string(),
    country: z.string(),
    language: z.string(),
    appsFound: z.number(),
    competitorsAnalysed: z.number(),
    reviewsAnalysed: z.number(),
    averageRating: z.number(),
    medianRating: z.number(),
    totalMinInstalls: z.number(),
    freeShare: z.number(),
    iapShare: z.number(),
    adShare: z.number(),
    activelyMaintainedShare: z.number(),
    distinctDevelopers: z.number(),
    histogram: histogramSchema,
  })
  .passthrough();

const reviewInsightsSchema = z
  .object({
    reviewsAnalysed: z.number(),
    complaints: z.array(themeBucketSchema).default([]),
    praise: z.array(themeBucketSchema).default([]),
    featureRequests: z.array(themeBucketSchema).default([]),
    quotes: z
      .object({
        negative: z.array(quoteSchema).default([]),
        positive: z.array(quoteSchema).default([]),
        featureRequests: z.array(quoteSchema).default([]),
      })
      .passthrough(),
  })
  .passthrough();

/** Body of POST /api/analyze - the output of POST /api/research. */
export const analyzeRequestSchema = z.object({
  input: researchInputSchema,
  competitors: z.array(competitorSchema).min(1, 'At least one competitor is required'),
  marketStats: marketStatsSchema,
  reviewInsights: reviewInsightsSchema,
});

/**
 * The analysis object as it round-trips from the client. It was validated
 * strictly when the model produced it; here we only need the fields the follow-up
 * prompts read.
 */
const analysisEchoSchema = z
  .object({
    marketSummary: z.string(),
    demandScore: z.number(),
    competitionScore: z.number(),
    painScore: z.number(),
    monetizationScore: z.number(),
    featureGapScore: z.number(),
    opportunityScore: z.number(),
    recommendation: z.enum(['STRONG', 'MODERATE', 'LOW']),
    recommendationHeadline: z.string(),
    recommendationReason: z.string(),
    recommendedApp: z
      .object({
        name: z.string(),
        tagline: z.string(),
        oneLiner: z.string(),
        category: z.string(),
        primaryDifferentiator: z.string(),
      })
      .passthrough(),
    targetUsers: z.array(z.object({ segment: z.string(), description: z.string(), share: z.number() }).passthrough()),
    existingMarketProblems: z.array(z.string()),
    commonComplaints: z.array(
      z
        .object({
          complaint: z.string(),
          percentage: z.number(),
          severity: z.string(),
          evidence: z.string(),
        })
        .passthrough(),
    ),
    missingFeatures: z.array(
      z
        .object({
          feature: z.string(),
          rationale: z.string(),
          demandLevel: z.string(),
          buildEffort: z.string(),
        })
        .passthrough(),
    ),
    differentiationStrategy: z.array(z.string()),
    monetizationIdeas: z.array(
      z.object({ model: z.string(), description: z.string(), potential: z.number() }).passthrough(),
    ),
    mvpFeatures: z.array(
      z
        .object({
          feature: z.string(),
          description: z.string(),
          priority: z.string(),
          effortWeeks: z.number(),
        })
        .passthrough(),
    ),
    risks: z.array(z.string()),
  })
  .passthrough();

/** Body of POST /api/build-plan. */
export const buildPlanRequestSchema = z.object({
  input: researchInputSchema,
  analysis: analysisEchoSchema,
});

/** Body of POST /api/dev-prompt. */
export const devPromptRequestSchema = z.object({
  input: researchInputSchema,
  analysis: analysisEchoSchema,
  plan: z
    .object({
      appName: z.string(),
      tagline: z.string(),
      targetAudience: z.array(z.string()),
      coreProblem: z.string(),
      valueProposition: z.string(),
      uniqueSellingProposition: z.string(),
      mvpFeatures: z.array(z.object({ feature: z.string(), description: z.string(), priority: z.string() }).passthrough()),
      advancedFeatures: z.array(z.object({ feature: z.string(), description: z.string() }).passthrough()),
      screens: z.array(z.object({ name: z.string(), purpose: z.string(), keyElements: z.array(z.string()) }).passthrough()),
      userFlow: z.array(z.object({ step: z.number(), title: z.string(), description: z.string() }).passthrough()),
      technicalArchitecture: z
        .object({
          summary: z.string(),
          components: z.array(
            z.object({ name: z.string(), responsibility: z.string(), technology: z.string() }).passthrough(),
          ),
        })
        .passthrough(),
      technologyStack: z.array(z.object({ layer: z.string(), choice: z.string(), reason: z.string() }).passthrough()),
      databaseEntities: z.array(
        z
          .object({
            name: z.string(),
            description: z.string(),
            fields: z.array(z.string()),
            relations: z.array(z.string()),
          })
          .passthrough(),
      ),
      requiredApis: z.array(z.object({ name: z.string(), purpose: z.string(), provider: z.string() }).passthrough()),
      monetization: z
        .object({
          primaryModel: z.string(),
          rationale: z.string(),
          pricingTiers: z.array(
            z.object({ name: z.string(), price: z.string(), features: z.array(z.string()) }).passthrough(),
          ),
        })
        .passthrough(),
      subscriptionStrategy: z
        .object({ summary: z.string(), trialDays: z.number(), tactics: z.array(z.string()) })
        .passthrough(),
      advertisingStrategy: z
        .object({
          summary: z.string(),
          formats: z.array(z.string()),
          placementRules: z.array(z.string()),
        })
        .passthrough(),
      notificationStrategy: z.array(
        z.object({ trigger: z.string(), channel: z.string(), message: z.string() }).passthrough(),
      ),
      securityConsiderations: z.array(z.string()),
      launchStrategy: z
        .array(z.object({ title: z.string(), description: z.string(), timing: z.string() }).passthrough())
        .default([]),
    })
    .passthrough(),
});

/** Body of POST /api/competitor. */
export const competitorRequestSchema = z.object({
  appId: z.string().trim().min(3).max(120),
  country: z.string().trim().toLowerCase().length(2),
  language: z.string().trim().toLowerCase().min(2).max(5),
  reviewCount: z.coerce.number().int().min(20).max(400).default(120),
});

/**
 * Body of POST /api/records - one persisted research document.
 *
 * Same philosophy as the analysis schemas above: validate the fields the server
 * actually reads to build a row, and let the rest of the document through
 * untouched. The record is produced by our own pipeline, so the goal is to
 * reject a malformed or hand-crafted body cheaply, not to re-derive the domain.
 */
export const researchRecordSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    input: z.object({ keyword: z.string(), country: z.string() }).passthrough(),
    stage: z.string(),
    status: z.string(),
    saved: z.boolean(),
    marketStats: z
      .object({ competitorsAnalysed: z.number(), reviewsAnalysed: z.number() })
      .passthrough(),
    usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).passthrough(),
  })
  .passthrough();

/** Body of POST /api/competitor/reviews. */
export const negativeReviewsRequestSchema = z.object({
  appId: z.string().trim().min(3).max(120),
  country: z.string().trim().toLowerCase().length(2),
  language: z.string().trim().toLowerCase().min(2).max(5),
});

/** Body of POST /api/competitor/extras - the same "one app, one market" lookup. */
export const competitorExtrasRequestSchema = negativeReviewsRequestSchema;
