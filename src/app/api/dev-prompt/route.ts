import type { NextRequest } from 'next/server';

import { fail, ok, readJson } from '@/lib/api-response';
import { devPromptRequestSchema } from '@/lib/api-schemas';
import { generateDevPrompt } from '@/lib/ai/analysis';
import type { BuildPlan, OpportunityAnalysis } from '@/lib/types';

/**
 * POST /api/dev-prompt
 *
 * Generates the self-contained coding prompt an AI coding assistant can build
 * the whole application from.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const parsed = devPromptRequestSchema.parse(body);

    const { data, usage } = await generateDevPrompt({
      input: parsed.input,
      analysis: parsed.analysis as unknown as OpportunityAnalysis,
      plan: parsed.plan as unknown as BuildPlan,
    });

    return ok({ prompt: data, usage });
  } catch (error) {
    return fail(error);
  }
}
