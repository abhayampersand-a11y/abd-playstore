import { z } from 'zod';

/**
 * Validation schemas for everything the model returns.
 *
 * These do double duty: they are handed to the API as the structured-output
 * format *and* re-run against the parsed result before a single pixel is
 * rendered. A model response is untrusted input like any other.
 *
 * Constraints deliberately kept model-friendly: every field required, no
 * optionals, no unions, no records - shapes that structured outputs handle
 * cleanly and that make a malformed response impossible to half-render.
 */

const score = z.number().min(0).max(10).describe('Score from 0 to 10, one decimal place');
const percentage = z.number().min(0).max(100);

export const recommendationSchema = z.enum(['STRONG', 'MODERATE', 'LOW']);
const levelSchema = z.enum(['high', 'medium', 'low']);
const prioritySchema = z.enum(['must-have', 'should-have', 'nice-to-have']);

export const targetUserSchema = z.object({
  segment: z.string().describe('Short name of the user segment'),
  description: z.string().describe('Who they are and what they are trying to do'),
  share: percentage.describe('Rough share of the addressable market, 0-100'),
});

export const analysedComplaintSchema = z.object({
  complaint: z.string().describe('The complaint in plain language'),
  percentage: percentage.describe('Share of complaining users affected, 0-100'),
  severity: levelSchema,
  evidence: z.string().describe('What in the review data supports this'),
});

export const missingFeatureSchema = z.object({
  feature: z.string(),
  rationale: z.string().describe('Why users need it and why incumbents do not ship it'),
  demandLevel: levelSchema,
  buildEffort: levelSchema,
});

export const monetizationIdeaSchema = z.object({
  model: z.string().describe('e.g. Freemium subscription, one-time unlock, B2B licence'),
  description: z.string(),
  potential: score.describe('Indicative revenue potential 0-10'),
});

export const mvpFeatureSchema = z.object({
  feature: z.string(),
  description: z.string(),
  priority: prioritySchema,
  effortWeeks: z.number().min(0).max(52),
});

export const developmentPhaseSchema = z.object({
  phase: z.string().describe('e.g. "Phase 1 - Core ledger"'),
  durationWeeks: z.number().min(0).max(104),
  goals: z.array(z.string()),
  deliverables: z.array(z.string()),
});

export const recommendedAppSchema = z.object({
  name: z.string().describe('A real, brandable product name - not a placeholder'),
  tagline: z.string().describe('One line, under 12 words'),
  oneLiner: z.string().describe('One sentence describing what the app does'),
  category: z.string().describe('Play Store category it would list under'),
  primaryDifferentiator: z.string().describe('The single sharpest reason to switch'),
});

export const opportunityAnalysisSchema = z.object({
  marketSummary: z.string().describe('3-5 sentences on the state of this market'),

  demandScore: score,
  competitionScore: score.describe('HIGHER means competition is WEAKER and more beatable'),
  painScore: score,
  monetizationScore: score,
  featureGapScore: score,
  opportunityScore: score.describe('Overall verdict, weighing all five'),

  recommendation: recommendationSchema,
  recommendationHeadline: z.string().describe('Under 10 words, e.g. "Build it - the gap is real"'),
  recommendationReason: z.string().describe('2-3 sentences justifying the verdict'),

  whyOpportunityExists: z.array(z.string()).describe('3-6 specific, evidence-backed reasons'),
  targetUsers: z.array(targetUserSchema).describe('2-4 segments'),
  existingMarketProblems: z.array(z.string()).describe('3-6 problems users face today'),
  commonComplaints: z.array(analysedComplaintSchema).describe('4-8 complaints, ranked'),
  missingFeatures: z.array(missingFeatureSchema).describe('4-8 gaps'),
  differentiationStrategy: z.array(z.string()).describe('3-6 concrete strategies'),
  monetizationIdeas: z.array(monetizationIdeaSchema).describe('3-5 models'),
  recommendedApp: recommendedAppSchema,
  mvpFeatures: z.array(mvpFeatureSchema).describe('5-9 features'),
  developmentPlan: z.array(developmentPhaseSchema).describe('3-5 phases'),
  risks: z.array(z.string()).describe('3-5 honest risks of building this'),
});

// ---------------------------------------------------------------------------
// Build plan
// ---------------------------------------------------------------------------

export const buildPlanSchema = z.object({
  appName: z.string(),
  tagline: z.string(),
  targetAudience: z.array(z.string()),
  coreProblem: z.string(),
  valueProposition: z.string(),
  uniqueSellingProposition: z.string(),

  mvpFeatures: z.array(mvpFeatureSchema).describe('6-10 features shippable in v1'),
  advancedFeatures: z.array(mvpFeatureSchema).describe('4-8 post-launch features'),

  userFlow: z
    .array(
      z.object({
        step: z.number().min(1).max(40),
        title: z.string(),
        description: z.string(),
      }),
    )
    .describe('6-12 steps from install to habitual use'),

  screens: z
    .array(
      z.object({
        name: z.string(),
        purpose: z.string(),
        keyElements: z.array(z.string()),
      }),
    )
    .describe('8-16 screens'),

  monetization: z.object({
    primaryModel: z.string(),
    rationale: z.string(),
    pricingTiers: z.array(
      z.object({
        name: z.string(),
        price: z.string().describe('Include currency, e.g. "₹199/month" or "Free"'),
        features: z.array(z.string()),
      }),
    ),
  }),

  subscriptionStrategy: z.object({
    summary: z.string(),
    trialDays: z.number().min(0).max(90),
    tactics: z.array(z.string()),
  }),

  advertisingStrategy: z.object({
    summary: z.string(),
    formats: z.array(z.string()),
    placementRules: z.array(z.string()).describe('Rules that keep ads from causing the very complaints found in research'),
  }),

  technicalArchitecture: z.object({
    summary: z.string(),
    components: z.array(
      z.object({
        name: z.string(),
        responsibility: z.string(),
        technology: z.string(),
      }),
    ),
  }),

  technologyStack: z.array(
    z.object({
      layer: z.string().describe('e.g. Mobile client, API, Database, Auth, Payments'),
      choice: z.string(),
      reason: z.string(),
    }),
  ),

  databaseEntities: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      fields: z.array(z.string()).describe('"name: type" strings'),
      relations: z.array(z.string()),
    }),
  ),

  requiredApis: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      provider: z.string(),
    }),
  ),

  notificationStrategy: z.array(
    z.object({
      trigger: z.string(),
      channel: z.string().describe('e.g. Push, Email, In-app'),
      message: z.string(),
    }),
  ),

  securityConsiderations: z.array(z.string()),

  launchStrategy: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      timing: z.string().describe('e.g. "2 weeks pre-launch"'),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Dev prompt
// ---------------------------------------------------------------------------

export const devPromptSchema = z.object({
  prompt: z.string().min(400).describe('The complete markdown coding prompt'),
});

export type OpportunityAnalysisOutput = z.infer<typeof opportunityAnalysisSchema>;
export type BuildPlanOutput = z.infer<typeof buildPlanSchema>;
export type DevPromptOutput = z.infer<typeof devPromptSchema>;
