import { getProvider } from '@/lib/ai/providers';
import { fail, ok } from '@/lib/api-response';
import { isAuthConfigured } from '@/lib/auth/credentials';
import { serverConfig } from '@/lib/server-env';
import type { HealthResponse } from '@/lib/types';

/**
 * GET /api/health
 *
 * Configuration status for the Settings page. It reports *whether* a key is
 * present - never the key itself, or any prefix of it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const provider = getProvider();

    const payload: HealthResponse = {
      aiConfigured: provider.isConfigured(),
      provider: provider.id,
      providerLabel: provider.label,
      providerIsPaid: provider.id === 'anthropic',
      authConfigured: isAuthConfigured(),
      model: provider.model,
      effort: serverConfig.effort,
      databaseConfigured: serverConfig.hasDatabase,
      maxCompetitorDetail: serverConfig.maxCompetitorDetail,
      maxReviewsPerApp: serverConfig.maxReviewsPerApp,
      checkedAt: new Date().toISOString(),
    };
    return ok(payload);
  } catch (error) {
    return fail(error);
  }
}
