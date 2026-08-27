import type { NextRequest } from 'next/server';

import { fail, ok, readJson } from '@/lib/api-response';
import { buildPlanRequestSchema } from '@/lib/api-schemas';
import { generateBuildPlan } from '@/lib/ai/analysis';
import type { OpportunityAnalysis } from '@/lib/types';

/**
 * POST /api/build-plan
 *
 * Backs the "Build This App" action: turns a completed opportunity analysis
 * into a full product and technical plan.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const parsed = buildPlanRequestSchema.parse(body);

    const { data, usage } = await generateBuildPlan({
      input: parsed.input,
      analysis: parsed.analysis as unknown as OpportunityAnalysis,
    });

    return ok({ plan: data, usage });
  } catch (error) {
    return fail(error);
  }
}
