import { AppError, parseApiError } from './errors';
import type {
  BuildPlan,
  Competitor,
  CompetitorDossier,
  HealthResponse,
  NegativeReviewsResponse,
  OpportunityAnalysis,
  ResearchInput,
  ResearchResponse,
  TokenUsage,
} from './types';
import type { LoginValues } from './validation';

/**
 * Typed client for the app's own API routes.
 *
 * Every call funnels through `request` so that a failed fetch, a non-JSON
 * response and a structured API error all arrive at the UI as the same
 * `AppError` - which is what lets the error screens stay simple.
 */
async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppError('TIMEOUT', 'The request was cancelled.');
    }
    throw new AppError('NETWORK_ERROR', 'Could not reach the AppScout server.', {
      hint: 'Check that the dev server is running and your connection is up.',
      cause: error,
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) {
      throw new AppError('UNKNOWN', 'The server returned an unreadable response.');
    }
  }

  if (!response.ok) {
    throw parseApiError(response.status, payload);
  }

  return payload as T;
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health', undefined, signal);
}

export function runResearch(input: ResearchInput, signal?: AbortSignal): Promise<ResearchResponse> {
  return request<ResearchResponse>('/api/research', input, signal);
}

export function runAnalysis(
  research: Pick<ResearchResponse, 'input' | 'competitors' | 'marketStats' | 'reviewInsights'>,
  signal?: AbortSignal,
): Promise<{ analysis: OpportunityAnalysis; usage: TokenUsage }> {
  return request('/api/analyze', research, signal);
}

export function runBuildPlan(
  params: { input: ResearchInput; analysis: OpportunityAnalysis },
  signal?: AbortSignal,
): Promise<{ plan: BuildPlan; usage: TokenUsage }> {
  return request('/api/build-plan', params, signal);
}

export function runDevPrompt(
  params: { input: ResearchInput; analysis: OpportunityAnalysis; plan: BuildPlan },
  signal?: AbortSignal,
): Promise<{ prompt: string; usage: TokenUsage }> {
  return request('/api/dev-prompt', params, signal);
}

export function fetchCompetitorDetail(
  params: { appId: string; country: string; language: string; reviewCount?: number },
  signal?: AbortSignal,
): Promise<{ competitor: Competitor; reviewsAnalysed: number }> {
  return request('/api/competitor', params, signal);
}

export function signIn(credentials: LoginValues, signal?: AbortSignal): Promise<{ username: string }> {
  return request('/api/auth/login', credentials, signal);
}

// Sent as a POST with an empty body so the browser cannot be tricked into
// signing the user out through a prefetch or an <img> tag.
export function signOut(signal?: AbortSignal): Promise<{ signedOut: boolean }> {
  return request('/api/auth/logout', {}, signal);
}

/**
 * The rest of the listing - permissions, data safety, the developer's other
 * apps, Play's similar apps - fetched when the detail page opens.
 */
export function fetchCompetitorExtras(
  params: { appId: string; country: string; language: string },
  signal?: AbortSignal,
): Promise<CompetitorDossier> {
  return request('/api/competitor/extras', params, signal);
}

export function fetchNegativeReviews(
  params: { appId: string; country: string; language: string },
  signal?: AbortSignal,
): Promise<NegativeReviewsResponse> {
  return request('/api/competitor/reviews', params, signal);
}
