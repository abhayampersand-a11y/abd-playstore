import 'server-only';

/**
 * Server-only environment access.
 *
 * The `server-only` import above makes it a build-time error to pull this
 * module into a client component, which is the mechanism that guarantees no API
 * key can ever reach the browser bundle.
 */

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export const serverConfig = {
  /** Gemini model used for every analysis call on the free-tier provider. */
  get geminiModel(): string {
    return process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
  },
  /** Claude model used for every analysis call on the Anthropic provider. */
  get claudeModel(): string {
    return process.env.CLAUDE_MODEL?.trim() || 'claude-opus-5';
  },
  /**
   * Reasoning depth for the heavyweight analysis calls, in the app's own
   * vocabulary. Each provider maps it onto whatever it actually supports.
   */
  get effort(): 'low' | 'medium' | 'high' | 'xhigh' | 'max' {
    const raw = process.env.AI_EFFORT?.trim() || process.env.CLAUDE_EFFORT?.trim();
    const allowed = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
    return (allowed as readonly string[]).includes(raw ?? '')
      ? (raw as 'low' | 'medium' | 'high' | 'xhigh' | 'max')
      : 'high';
  },
  /** Hard ceiling on detailed competitor fetches - protects latency and quota. */
  get maxCompetitorDetail(): number {
    return readInt('MAX_COMPETITOR_DETAIL', 12, 3, 25);
  },
  /** Hard ceiling on reviews pulled per competitor. */
  get maxReviewsPerApp(): number {
    return readInt('MAX_REVIEWS_PER_APP', 200, 20, 500);
  },
  /** Whether a Postgres connection string is configured. */
  get hasDatabase(): boolean {
    return Boolean(process.env.DATABASE_URL?.trim());
  },
};
