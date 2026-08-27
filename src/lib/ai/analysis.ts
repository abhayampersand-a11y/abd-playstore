import 'server-only';

import { structuredCall, type StructuredResult } from './providers';
import {
  ANALYST_SYSTEM_PROMPT,
  BUILD_PLAN_SYSTEM_PROMPT,
  DEV_PROMPT_SYSTEM_PROMPT,
  buildAnalysisUserMessage,
  buildBuildPlanUserMessage,
  buildDevPromptUserMessage,
} from './prompts';
import { buildPlanSchema, devPromptSchema, opportunityAnalysisSchema } from './schemas';
import { bandForScore, clampScoreSet } from '../research/scoring';
import type { AnalysisPayload, BuildPlan, OpportunityAnalysis, ResearchInput } from '../types';

/**
 * Opportunity analysis - the core call.
 *
 * The model's scores are clamped to 0-10 and the traffic-light band is derived
 * locally from `opportunityScore` rather than trusted from the response. That
 * keeps the badge and the number from ever contradicting each other on screen,
 * which is the kind of inconsistency that destroys trust in an analysis tool.
 */
export async function generateOpportunityAnalysis(
  payload: AnalysisPayload,
): Promise<StructuredResult<OpportunityAnalysis>> {
  const result = await structuredCall({
    schema: opportunityAnalysisSchema,
    system: ANALYST_SYSTEM_PROMPT,
    userContent: buildAnalysisUserMessage(payload),
    maxTokens: 32_000,
  });

  const scores = clampScoreSet(result.data);
  const analysis: OpportunityAnalysis = {
    ...result.data,
    ...scores,
    recommendation: bandForScore(scores.opportunityScore),
  };

  return { data: analysis, usage: result.usage };
}

/** "Build This App" - the full product and technical plan. */
export async function generateBuildPlan(params: {
  input: ResearchInput;
  analysis: OpportunityAnalysis;
}): Promise<StructuredResult<BuildPlan>> {
  return structuredCall({
    schema: buildPlanSchema,
    system: BUILD_PLAN_SYSTEM_PROMPT,
    userContent: buildBuildPlanUserMessage(params),
    maxTokens: 48_000,
  });
}

/**
 * The development prompt. Run at `medium` effort: by this point every product
 * decision has already been made upstream, so this call is transcription into a
 * spec rather than fresh reasoning, and paying for deep thinking here buys
 * nothing.
 */
export async function generateDevPrompt(params: {
  input: ResearchInput;
  analysis: OpportunityAnalysis;
  plan: BuildPlan;
}): Promise<StructuredResult<string>> {
  const result = await structuredCall({
    schema: devPromptSchema,
    system: DEV_PROMPT_SYSTEM_PROMPT,
    userContent: buildDevPromptUserMessage(params),
    maxTokens: 32_000,
    effort: 'medium',
  });

  return { data: result.data.prompt, usage: result.usage };
}
