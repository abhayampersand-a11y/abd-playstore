import type { NextRequest } from 'next/server';

import { fail, ok, readJson } from '@/lib/api-response';
import { analyzeRequestSchema } from '@/lib/api-schemas';
import { generateOpportunityAnalysis } from '@/lib/ai/analysis';
import { buildAnalysisPayload } from '@/lib/research/pipeline';
import type { ResearchResponse } from '@/lib/types';

/**
 * POST /api/analyze
 *
 * Takes the cleaned research dataset and asks the model for the opportunity
 * analysis. The provider key lives only in this process; the browser never sees
 * it and never talks to api.anthropic.com directly.
 *
 * Note that the *server* builds the compact model payload from the full
 * dataset. Trimming on the client would let a caller inflate the prompt.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const research = analyzeRequestSchema.parse(body) as unknown as ResearchResponse;

    const payload = buildAnalysisPayload({ ...research, warnings: [] });
    const { data, usage } = await generateOpportunityAnalysis(payload);

    return ok({ analysis: data, usage });
  } catch (error) {
    return fail(error);
  }
}
