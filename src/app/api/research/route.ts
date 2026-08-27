import type { NextRequest } from 'next/server';

import { fail, ok, readJson } from '@/lib/api-response';
import { runResearchPipeline } from '@/lib/research/pipeline';
import { researchInputSchema } from '@/lib/validation';

/**
 * POST /api/research
 *
 * Scrapes Google Play and returns the cleaned research dataset. No AI call
 * happens here - this route is useful on its own and stays available even when
 * no API key is configured.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const input = researchInputSchema.parse(body);
    const result = await runResearchPipeline(input);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
