/**
 * AppScout AI - shared domain types.
 *
 * These types are the contract between the scraping pipeline, the AI
 * analysis layer, the API routes and the UI. They intentionally mirror
 * `prisma/schema.prisma` so a future Postgres/Neon persistence layer is a
 * drop-in swap for the bundled localStorage repository.
 */

// ---------------------------------------------------------------------------
// Research request
// ---------------------------------------------------------------------------

export interface ResearchInput {
  /** App idea, category or keyword the user typed, e.g. "Expense Manager". */
  keyword: string;
  /** ISO-3166 alpha-2 country code, lowercase. */
  country: string;
  /** ISO-639-1 language code, lowercase. */
  language: string;
  /** How many competitor apps to pull full detail for. */
  competitorCount: number;
  /** How many reviews to analyse per competitor. */
  reviewCount: number;
}

export const RESEARCH_STAGES = [
  'search',
  'competitors',
  'reviews',
  'analysis',
  'opportunity',
  'buildPlan',
  'devPrompt',
] as const;

export type ResearchStage = (typeof RESEARCH_STAGES)[number];

export type ResearchStatus = 'pending' | 'running' | 'complete' | 'failed';

export type Recommendation = 'STRONG' | 'MODERATE' | 'LOW';

// ---------------------------------------------------------------------------
// Google Play data (normalised)
// ---------------------------------------------------------------------------

/** Lightweight competitor row produced by the search step. */
export interface CompetitorSummary {
  appId: string;
  title: string;
  developer: string;
  developerId?: string;
  icon?: string;
  url?: string;
  summary?: string;
  score?: number;
  free: boolean;
  priceText?: string;
  currency?: string;
}

export interface RatingHistogram {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
}

/** A Play category chip, e.g. { name: 'Strategy', id: 'GAME_STRATEGY' }. */
export interface AppCategory {
  name: string;
  id?: string;
}

/** One Android permission the listing declares, e.g. "read your contacts". */
export interface AppPermission {
  permission: string;
  /** Play's own grouping - "Contacts", "Storage", "Other". */
  type: string;
}

/** One row of Play's "Data safety" table. */
export interface DataSafetyEntry {
  /** The datum itself, e.g. "Email address". */
  data: string;
  /** Its group, e.g. "Personal info". */
  type: string;
  purpose?: string;
  /** False when the app cannot be used without handing this over. */
  optional?: boolean;
}

export interface DataSafetyReport {
  collected: DataSafetyEntry[];
  shared: DataSafetyEntry[];
  securityPractices: Array<{ practice: string; description?: string }>;
  privacyPolicyUrl?: string;
}

/** Full competitor record produced by the detail step. */
export interface Competitor extends CompetitorSummary {
  /** Rank within this research run, 1-based. Drives table ordering. */
  rank: number;
  ratingCount?: number;
  reviewCount?: number;
  installs?: string;
  minInstalls?: number;
  maxInstalls?: number;
  /** Play Store 1..5 star histogram. */
  histogram?: RatingHistogram;
  offersIAP: boolean;
  iapRange?: string;
  adSupported: boolean;
  genre?: string;
  genreId?: string;
  contentRating?: string;
  androidVersion?: string;
  version?: string;
  /** ISO date string. */
  updated?: string;
  released?: string;
  description?: string;
  screenshots: string[];
  headerImage?: string;
  developerWebsite?: string;
  privacyPolicy?: string;
  /** Populated only for competitors selected for review analysis. */
  reviewStats?: CompetitorReviewStats;
  /** Play Store "similar apps", best-effort. */
  similarApps?: CompetitorSummary[];

  // -- The rest of the listing ----------------------------------------------
  // Everything below is what someone sizing up a market to build into wants to
  // read: what the app ships, how it charges, what it touches on the device,
  // and who is behind it. All optional - Play omits plenty of it per app, and
  // records written before these fields existed simply do not have them.

  /** "What's new", tags stripped. What the team is actually shipping. */
  recentChanges?: string;
  /** Play's plain-English note on the content rating. */
  contentRatingDescription?: string;
  categories?: AppCategory[];
  /** Promo video and its still frame. Games nearly always have one. */
  video?: string;
  videoImage?: string;
  androidMaxVersion?: string;
  /** Numeric price in `currency`; 0 for a free app. */
  price?: number;
  /** Only set while the app is discounted. */
  originalPrice?: number;
  /** False when Play will not serve this app in the researched market. */
  available?: boolean;
  preregister?: boolean;
  earlyAccess?: boolean;
  inPlayPass?: boolean;
  developerEmail?: string;
  developerAddress?: string;
  developerLegalName?: string;

  // -- Fetched on demand by the detail page (see CompetitorDossier) ----------
  permissions?: AppPermission[];
  dataSafety?: DataSafetyReport;
  /** Everything else the same developer publishes. */
  developerApps?: CompetitorSummary[];
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface CleanReview {
  appId: string;
  /** 1..5 */
  score: number;
  text: string;
  /** ISO date string. */
  date?: string;
  thumbsUp?: number;
  version?: string;
}

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface SentimentSplit {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ReviewQuote {
  appId: string;
  appTitle?: string;
  score: number;
  text: string;
  date?: string;
  thumbsUp?: number;
}

/** A detected theme with its share of the reviews it was measured against. */
export interface ThemeBucket {
  /** Stable machine id, e.g. "ads". */
  id: string;
  /** Human label, e.g. "Too many advertisements". */
  label: string;
  /** Number of reviews matching the theme. */
  count: number;
  /** Share of the measured population, 0-100, rounded to 1dp. */
  percentage: number;
  /** Up to 3 short supporting quotes. */
  examples: string[];
}

/** Per-competitor review roll-up. Persisted with the competitor. */
export interface CompetitorReviewStats {
  analysed: number;
  averageScore: number;
  sentiment: SentimentSplit;
  histogram: RatingHistogram;
  /** Theme buckets detected in this app's negative reviews. */
  complaints: ThemeBucket[];
  /** Theme buckets detected in this app's positive reviews. */
  praise: ThemeBucket[];
  /** Up to 5 representative quotes per polarity. */
  topNegative: ReviewQuote[];
  topPositive: ReviewQuote[];
  featureRequests: ReviewQuote[];
}

// ---------------------------------------------------------------------------
// Market aggregates (computed locally, before the AI runs)
// ---------------------------------------------------------------------------

export interface MarketStats {
  keyword: string;
  country: string;
  language: string;
  /** Apps returned by the Play Store search. */
  appsFound: number;
  /** Apps we pulled full detail for. */
  competitorsAnalysed: number;
  reviewsAnalysed: number;
  averageRating: number;
  medianRating: number;
  /** Sum of `minInstalls` across analysed competitors. */
  totalMinInstalls: number;
  /** Share of analysed competitors that are free to install, 0-100. */
  freeShare: number;
  /** Share that offer in-app purchases, 0-100. */
  iapShare: number;
  /** Share that are ad supported, 0-100. */
  adShare: number;
  /** Share updated within the last 180 days, 0-100. */
  activelyMaintainedShare: number;
  /** Distinct developers among analysed competitors. */
  distinctDevelopers: number;
  /** Combined 1..5 histogram across analysed competitors. */
  histogram: RatingHistogram;
}

/** Cross-competitor review intelligence. Powers the Review Intelligence page. */
export interface ReviewInsights {
  reviewsAnalysed: number;
  negativeReviews: number;
  positiveReviews: number;
  neutralReviews: number;
  sentiment: SentimentSplit;
  histogram: RatingHistogram;
  /** Ranked complaint themes across every analysed competitor. */
  complaints: ThemeBucket[];
  /** Ranked praise themes. */
  praise: ThemeBucket[];
  /** Ranked feature-request themes. */
  featureRequests: ThemeBucket[];
  /** Representative quotes, already length-capped. */
  quotes: {
    negative: ReviewQuote[];
    positive: ReviewQuote[];
    featureRequests: ReviewQuote[];
  };
  /** Per-app average score, for the comparison chart. */
  perApp: Array<{
    appId: string;
    title: string;
    averageScore: number;
    analysed: number;
    negativeShare: number;
  }>;
}

// ---------------------------------------------------------------------------
// AI output - opportunity analysis
// ---------------------------------------------------------------------------

export interface ScoreSet {
  demandScore: number;
  competitionScore: number;
  painScore: number;
  monetizationScore: number;
  featureGapScore: number;
  opportunityScore: number;
}

export interface RecommendedApp {
  name: string;
  tagline: string;
  oneLiner: string;
  category: string;
  primaryDifferentiator: string;
}

export interface TargetUser {
  segment: string;
  description: string;
  /** Rough share of the addressable market this segment represents, 0-100. */
  share: number;
}

export interface AnalysedComplaint {
  complaint: string;
  /** Share of complaints this represents, 0-100. */
  percentage: number;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
}

export interface MissingFeature {
  feature: string;
  rationale: string;
  demandLevel: 'high' | 'medium' | 'low';
  buildEffort: 'high' | 'medium' | 'low';
}

export interface MonetizationIdea {
  model: string;
  description: string;
  /** Indicative revenue potential 0-10. */
  potential: number;
}

export interface MvpFeature {
  feature: string;
  description: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  effortWeeks: number;
}

export interface DevelopmentPhase {
  phase: string;
  durationWeeks: number;
  goals: string[];
  deliverables: string[];
}

export interface OpportunityAnalysis extends ScoreSet {
  marketSummary: string;
  recommendation: Recommendation;
  recommendationHeadline: string;
  recommendationReason: string;
  whyOpportunityExists: string[];
  targetUsers: TargetUser[];
  existingMarketProblems: string[];
  commonComplaints: AnalysedComplaint[];
  missingFeatures: MissingFeature[];
  differentiationStrategy: string[];
  monetizationIdeas: MonetizationIdea[];
  recommendedApp: RecommendedApp;
  mvpFeatures: MvpFeature[];
  developmentPlan: DevelopmentPhase[];
  risks: string[];
}

// ---------------------------------------------------------------------------
// AI output - build plan
// ---------------------------------------------------------------------------

export interface UserFlowStep {
  step: number;
  title: string;
  description: string;
}

export interface ScreenSpec {
  name: string;
  purpose: string;
  keyElements: string[];
}

export interface PricingTier {
  name: string;
  price: string;
  features: string[];
}

export interface ArchitectureComponent {
  name: string;
  responsibility: string;
  technology: string;
}

export interface TechChoice {
  layer: string;
  choice: string;
  reason: string;
}

export interface DatabaseEntity {
  name: string;
  description: string;
  fields: string[];
  relations: string[];
}

export interface ApiRequirement {
  name: string;
  purpose: string;
  provider: string;
}

export interface NotificationSpec {
  trigger: string;
  channel: string;
  message: string;
}

export interface LaunchStep {
  title: string;
  description: string;
  timing: string;
}

export interface BuildPlan {
  appName: string;
  tagline: string;
  targetAudience: string[];
  coreProblem: string;
  valueProposition: string;
  uniqueSellingProposition: string;
  mvpFeatures: MvpFeature[];
  advancedFeatures: MvpFeature[];
  userFlow: UserFlowStep[];
  screens: ScreenSpec[];
  monetization: {
    primaryModel: string;
    rationale: string;
    pricingTiers: PricingTier[];
  };
  subscriptionStrategy: {
    summary: string;
    trialDays: number;
    tactics: string[];
  };
  advertisingStrategy: {
    summary: string;
    formats: string[];
    placementRules: string[];
  };
  technicalArchitecture: {
    summary: string;
    components: ArchitectureComponent[];
  };
  technologyStack: TechChoice[];
  databaseEntities: DatabaseEntity[];
  requiredApis: ApiRequirement[];
  notificationStrategy: NotificationSpec[];
  securityConsiderations: string[];
  launchStrategy: LaunchStep[];
}

// ---------------------------------------------------------------------------
// Persisted research record
// ---------------------------------------------------------------------------

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export interface ResearchRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  input: ResearchInput;
  stage: ResearchStage;
  status: ResearchStatus;
  error?: string;
  saved: boolean;
  competitors: Competitor[];
  marketStats: MarketStats;
  reviewInsights: ReviewInsights;
  analysis?: OpportunityAnalysis;
  buildPlan?: BuildPlan;
  devPrompt?: string;
  usage: TokenUsage;
}

/** Trimmed record used by list views so we never render 10 full descriptions. */
export interface ResearchListItem {
  id: string;
  createdAt: string;
  keyword: string;
  country: string;
  competitorsAnalysed: number;
  reviewsAnalysed: number;
  opportunityScore?: number;
  recommendation?: Recommendation;
  stage: ResearchStage;
  status: ResearchStatus;
  saved: boolean;
  appName?: string;
}

export interface SavedIdea {
  id: string;
  researchId: string;
  createdAt: string;
  name: string;
  tagline: string;
  keyword: string;
  opportunityScore: number;
  recommendation: Recommendation;
  notes?: string;
}

// ---------------------------------------------------------------------------
// API payloads
// ---------------------------------------------------------------------------

/** Result of `POST /api/research` - everything scraped and cleaned. */
export interface ResearchResponse {
  input: ResearchInput;
  competitors: Competitor[];
  marketStats: MarketStats;
  reviewInsights: ReviewInsights;
  /** Warnings that did not stop the run, e.g. "3 apps returned no reviews". */
  warnings: string[];
}

/** Compact, token-controlled payload handed to the model. */
export interface AnalysisPayload {
  input: ResearchInput;
  marketStats: MarketStats;
  competitors: Array<{
    title: string;
    developer: string;
    installs?: string;
    minInstalls?: number;
    score?: number;
    ratingCount?: number;
    free: boolean;
    priceText?: string;
    offersIAP: boolean;
    adSupported: boolean;
    genre?: string;
    updated?: string;
    summary?: string;
  }>;
  complaints: Array<Pick<ThemeBucket, 'label' | 'count' | 'percentage'>>;
  praise: Array<Pick<ThemeBucket, 'label' | 'count' | 'percentage'>>;
  featureRequests: Array<Pick<ThemeBucket, 'label' | 'count' | 'percentage'>>;
  sampleNegativeReviews: string[];
  samplePositiveReviews: string[];
  sampleFeatureRequests: string[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Actionable hint rendered under the message in the UI. */
    hint?: string;
    retryable: boolean;
  };
}

/** Response of `GET /api/health` - configuration status for the Settings page. */
export interface HealthResponse {
  /** Whether the selected AI provider has a usable key. */
  aiConfigured: boolean;
  /** Which provider runs the AI stages. */
  provider: 'gemini' | 'anthropic';
  /** Human-facing provider name. */
  providerLabel: string;
  /** Whether the provider bills per token, or runs on a free tier. */
  providerIsPaid: boolean;
  /** Whether AUTH_USERNAME/AUTH_PASSWORD define an account on this server. */
  authConfigured: boolean;
  model: string;
  effort: string;
  databaseConfigured: boolean;
  maxCompetitorDetail: number;
  maxReviewsPerApp: number;
  checkedAt: string;
}

/**
 * Response of POST /api/competitor/extras.
 *
 * `competitor` is a freshly scraped listing rather than the stored one, so a
 * record written before a field existed still shows that field today. Every
 * other lookup is best-effort: Play answers some of them for some apps only,
 * and a refusal is reported in `unavailable` rather than failing the request.
 */
export interface CompetitorDossier {
  /** Fresh listing, with permissions, data safety, the developer's catalogue
   *  and Play's similar apps already attached. */
  competitor: Competitor;
  /** Human-readable names of the lookups Play would not answer. */
  unavailable: string[];
}

/** Response of POST /api/competitor/reviews. */
export interface NegativeReviewsResponse {
  appId: string;
  /** Every 1-2 star review found, newest first. */
  reviews: CleanReview[];
  /** How many reviews were read to find them. */
  scanned: number;
  /** True when a page or time cap stopped the sweep before Play ran out. */
  truncated: boolean;
}
