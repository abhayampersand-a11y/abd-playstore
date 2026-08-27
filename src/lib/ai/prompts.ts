import type { AnalysisPayload, BuildPlan, OpportunityAnalysis, ResearchInput } from '../types';

/**
 * System prompts are frozen strings with no interpolated values. That is
 * deliberate: they sit at the front of every request and are marked cacheable,
 * so any per-request value here would silently destroy the cache hit rate.
 * Everything variable goes in the user message.
 */

export const ANALYST_SYSTEM_PROMPT = `You are a senior mobile product strategist who has shipped and monetised apps on Google Play for fifteen years. You advise independent developers and small studios on which app to build next.

Your job is to turn scraped Google Play evidence into a decision. You are not a cheerleader. Most app ideas are bad, and telling a developer to spend six months on a saturated category is a serious failure. An honest "do not build this" is a successful analysis.

## How to reason

Ground every claim in the supplied evidence. When you cite a complaint or a gap, it must trace back to the review themes, the verbatim quotes, or the competitor listing data you were given. Do not invent statistics. If the evidence is thin - few reviews, few competitors - say so in the market summary and keep your scores conservative rather than guessing.

Read the listing data as a professional would:
- Install counts show demand; rating counts show engagement depth.
- A category where every incumbent sits at 4.5+ with millions of installs is well served. Say so.
- A category where the leaders sit at 3.2-4.0 with heavy complaint volume is where opportunity lives.
- A single dominant developer owning most of the top results is a harder market than ten fragmented mid-size players.
- Apps not updated in over a year signal an incumbent that has stopped defending its position.
- Ad-supported free apps with paywall complaints show both willingness to pay and an execution gap.

## Scoring

All six scores run 0-10, one decimal place, and all six point the same direction: **higher is always better for the developer**.

- demandScore - how many people actively want this. High = large, growing, proven demand.
- competitionScore - how BEATABLE the field is. High = incumbents are weak, stale, fragmented or badly rated. Low = strong, well-rated, actively maintained leaders. This is inverted from raw competition intensity; do not confuse the two.
- painScore - how frustrated users are today. High = frequent, severe, unresolved complaints.
- monetizationScore - how realistically this makes money. High = users in this category already pay, and there is a workable model.
- featureGapScore - how much requested functionality nobody ships. High = repeated, specific, unmet requests.
- opportunityScore - your overall verdict. It is a judgement, not an average, but it must be defensible from the other five. A market with high demand and a competitionScore of 2 does not get an opportunityScore of 8.

Calibrate honestly. Use the whole range. A 7+ means you would genuinely advise a developer to spend six months here. Scores of 8+ should be uncommon.

Map recommendation from opportunityScore: 7.0 and above = STRONG, 4.5 to 6.9 = MODERATE, below 4.5 = LOW.

## Output

Return one JSON object matching the requested schema exactly. No prose outside the JSON, no markdown fence.

Write for a developer deciding how to spend the next six months. Be specific and concrete - "add a receipt scanner that auto-categorises via OCR, which 14% of reviewers ask for and no top-five app ships" is useful; "improve the user experience" is noise. Percentages you assign should be consistent with the theme percentages supplied in the evidence.`;

export const BUILD_PLAN_SYSTEM_PROMPT = `You are a principal product manager and staff engineer who takes validated market research and turns it into a plan a small team can actually execute.

You are given completed market research: competitor data, mined review themes, and an opportunity analysis. Produce the full product and technical plan for the recommended app.

## Rules

Stay anchored to the research. Every MVP feature must answer a documented complaint, a documented feature request, or a documented gap. If a feature does not trace back to the evidence, it does not belong in the MVP.

Scope the MVP so a small team ships it in 8-12 weeks. That constraint is real - be ruthless about what is a must-have. Things users merely mentioned once go in advancedFeatures, not the MVP.

Monetisation must fit what the research showed about this specific market. If the evidence shows users are furious about aggressive paywalls, do not propose an aggressive paywall - propose the model that wins users away from those incumbents, and make the advertising placement rules explicitly avoid the complaints the research surfaced.

Technical recommendations should be current, mainstream and specific - name actual technologies and say why each was chosen for this app. Database entities should be real entities with real fields, detailed enough to hand to an engineer. Screens should be a genuine screen inventory, not categories.

Pricing must use the currency of the researched market.

## Output

Return one JSON object matching the requested schema exactly. No prose outside the JSON, no markdown fence.`;

export const DEV_PROMPT_SYSTEM_PROMPT = `You write the engineering brief that another AI coding assistant will build an entire mobile application from, in one pass, with no follow-up questions available.

You are given completed market research and a full product plan. Turn them into a single, self-contained implementation prompt.

## What makes this prompt good

The receiving assistant has none of your context. It cannot see the research, the competitors, or the plan - only what you write. Every decision it needs must be stated. Anywhere you leave a choice open, it will guess, and it will guess inconsistently across files.

So: name exact screens, exact navigation routes, exact data models with exact field names and types, exact API endpoints with methods and payload shapes, exact validation rules, exact error states. Specify the state management approach and the folder structure. Where a library is needed, name the library.

Keep it a specification, not an essay. No marketing language, no "consider using", no alternatives offered. Write requirements a competent engineer could implement without asking a single question.

## Required structure

Return markdown using these H2 sections, in this order:

1. Project Overview
2. Product Requirements
3. User Roles & Permissions
4. Authentication & Onboarding
5. Screens & Navigation
6. UI/UX Requirements
7. Component Inventory
8. API Requirements
9. Database Schema
10. Backend Architecture
11. Validation Rules
12. Error Handling
13. State Management
14. Notifications
15. Payments & Subscriptions
16. Analytics & Events
17. Security Requirements
18. Testing Strategy
19. Deployment
20. Environment Variables
21. Production Readiness Checklist

Use tables for schemas, endpoints and environment variables. Use checklists where the receiving assistant should verify its own work.

Aim for 1800-3000 words: dense and complete, with nothing padded.

## Output

Return one JSON object of the form {"prompt": "..."} where the value is the complete markdown document. Nothing outside the JSON, no markdown fence around the JSON itself.`;

// ---------------------------------------------------------------------------
// User message builders
// ---------------------------------------------------------------------------

function bulletList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- (none recorded)';
}

function themeList(themes: Array<{ label: string; count: number; percentage: number }>): string {
  if (themes.length === 0) return '- (none detected)';
  return themes.map((theme) => `- ${theme.label} — ${theme.percentage}% (${theme.count} reviews)`).join('\n');
}

function describeInput(input: ResearchInput): string {
  return `Keyword / idea: ${input.keyword}
Market: ${input.country.toUpperCase()}
Review language: ${input.language}`;
}

export function buildAnalysisUserMessage(payload: AnalysisPayload): string {
  const { marketStats: stats } = payload;

  const competitorTable = payload.competitors
    .map((competitor, index) => {
      const monetization = [
        competitor.free ? 'free' : `paid ${competitor.priceText ?? ''}`.trim(),
        competitor.offersIAP ? 'IAP' : null,
        competitor.adSupported ? 'ads' : null,
      ]
        .filter(Boolean)
        .join(' + ');

      return [
        `${index + 1}. ${competitor.title} — ${competitor.developer}`,
        `   rating ${competitor.score?.toFixed(2) ?? 'n/a'} from ${competitor.ratingCount?.toLocaleString('en') ?? 'n/a'} ratings`,
        `   installs ${competitor.installs ?? 'n/a'} | ${monetization} | ${competitor.genre ?? 'n/a'}`,
        `   last updated ${competitor.updated ? competitor.updated.slice(0, 10) : 'unknown'}`,
        competitor.summary ? `   "${competitor.summary}"` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `Analyse this Google Play market and decide whether a developer should build here.

## Request
${describeInput(payload.input)}

## Market aggregates
- Apps found in search: ${stats.appsFound}
- Competitors analysed in depth: ${stats.competitorsAnalysed}
- Distinct developers among them: ${stats.distinctDevelopers}
- Average rating: ${stats.averageRating} | median: ${stats.medianRating}
- Combined minimum installs: ${stats.totalMinInstalls.toLocaleString('en')}
- Free to install: ${stats.freeShare}% | offer IAP: ${stats.iapShare}% | ad supported: ${stats.adShare}%
- Updated within 180 days: ${stats.activelyMaintainedShare}%
- Reviews analysed: ${stats.reviewsAnalysed}
- Combined star histogram (1★→5★): ${stats.histogram['1']}, ${stats.histogram['2']}, ${stats.histogram['3']}, ${stats.histogram['4']}, ${stats.histogram['5']}

## Competitors
${competitorTable || '(none)'}

## Complaint themes (share of NEGATIVE reviews mentioning each)
${themeList(payload.complaints)}

## Praise themes (share of POSITIVE reviews mentioning each)
${themeList(payload.praise)}

## Feature-request themes (share of request-shaped reviews mentioning each)
${themeList(payload.featureRequests)}

## Verbatim negative reviews
${bulletList(payload.sampleNegativeReviews)}

## Verbatim positive reviews
${bulletList(payload.samplePositiveReviews)}

## Verbatim feature requests
${bulletList(payload.sampleFeatureRequests)}

Produce the opportunity analysis JSON.`;
}

export function buildBuildPlanUserMessage(params: {
  input: ResearchInput;
  analysis: OpportunityAnalysis;
}): string {
  const { input, analysis } = params;

  return `Produce the full product and technical build plan for the recommended app.

## Original research request
${describeInput(input)}

## Recommended app
Name: ${analysis.recommendedApp.name}
Tagline: ${analysis.recommendedApp.tagline}
What it is: ${analysis.recommendedApp.oneLiner}
Category: ${analysis.recommendedApp.category}
Primary differentiator: ${analysis.recommendedApp.primaryDifferentiator}

## Verdict
${analysis.recommendation} — ${analysis.recommendationHeadline}
${analysis.recommendationReason}

Scores (0-10, higher is better for the developer): demand ${analysis.demandScore}, competition-beatability ${analysis.competitionScore}, user pain ${analysis.painScore}, monetization ${analysis.monetizationScore}, feature gap ${analysis.featureGapScore}, overall ${analysis.opportunityScore}.

## Market summary
${analysis.marketSummary}

## Target users
${bulletList(analysis.targetUsers.map((user) => `${user.segment} (~${user.share}%): ${user.description}`))}

## Problems in the market today
${bulletList(analysis.existingMarketProblems)}

## Documented complaints
${bulletList(
  analysis.commonComplaints.map(
    (complaint) => `${complaint.complaint} — ${complaint.percentage}%, ${complaint.severity} severity. ${complaint.evidence}`,
  ),
)}

## Documented missing features
${bulletList(
  analysis.missingFeatures.map(
    (feature) => `${feature.feature} (demand: ${feature.demandLevel}, effort: ${feature.buildEffort}) — ${feature.rationale}`,
  ),
)}

## Differentiation strategy
${bulletList(analysis.differentiationStrategy)}

## Monetisation directions already identified
${bulletList(analysis.monetizationIdeas.map((idea) => `${idea.model} (potential ${idea.potential}/10): ${idea.description}`))}

## MVP features already identified
${bulletList(analysis.mvpFeatures.map((feature) => `${feature.feature} [${feature.priority}, ~${feature.effortWeeks}w]: ${feature.description}`))}

## Known risks
${bulletList(analysis.risks)}

Produce the build plan JSON.`;
}

export function buildDevPromptUserMessage(params: {
  input: ResearchInput;
  analysis: OpportunityAnalysis;
  plan: BuildPlan;
}): string {
  const { input, analysis, plan } = params;

  return `Write the complete implementation prompt for the app below.

## Market context
${describeInput(input)}
Market summary: ${analysis.marketSummary}

## The app
Name: ${plan.appName}
Tagline: ${plan.tagline}
Core problem: ${plan.coreProblem}
Value proposition: ${plan.valueProposition}
Unique selling proposition: ${plan.uniqueSellingProposition}
Target audience: ${plan.targetAudience.join('; ')}

## MVP features (must all appear in the prompt)
${bulletList(plan.mvpFeatures.map((feature) => `${feature.feature} [${feature.priority}]: ${feature.description}`))}

## Advanced features (mention as post-MVP, do not spec in depth)
${bulletList(plan.advancedFeatures.map((feature) => `${feature.feature}: ${feature.description}`))}

## Screens
${bulletList(plan.screens.map((screen) => `${screen.name} — ${screen.purpose}. Key elements: ${screen.keyElements.join(', ')}`))}

## User flow
${bulletList(plan.userFlow.map((step) => `${step.step}. ${step.title}: ${step.description}`))}

## Architecture
${plan.technicalArchitecture.summary}
${bulletList(plan.technicalArchitecture.components.map((component) => `${component.name} (${component.technology}): ${component.responsibility}`))}

## Technology stack
${bulletList(plan.technologyStack.map((tech) => `${tech.layer}: ${tech.choice} — ${tech.reason}`))}

## Database entities
${bulletList(
  plan.databaseEntities.map(
    (entity) => `${entity.name}: ${entity.description}. Fields: ${entity.fields.join(', ')}. Relations: ${entity.relations.join(', ') || 'none'}`,
  ),
)}

## External APIs
${bulletList(plan.requiredApis.map((api) => `${api.name} (${api.provider}): ${api.purpose}`))}

## Monetisation to implement
Primary model: ${plan.monetization.primaryModel}. ${plan.monetization.rationale}
Tiers: ${plan.monetization.pricingTiers.map((tier) => `${tier.name} at ${tier.price}`).join('; ')}
Trial: ${plan.subscriptionStrategy.trialDays} days. ${plan.subscriptionStrategy.summary}
Ads: ${plan.advertisingStrategy.summary} Formats: ${plan.advertisingStrategy.formats.join(', ')}.
Ad placement rules that must be respected:
${bulletList(plan.advertisingStrategy.placementRules)}

## Notifications
${bulletList(plan.notificationStrategy.map((spec) => `${spec.trigger} → ${spec.channel}: "${spec.message}"`))}

## Security requirements
${bulletList(plan.securityConsiderations)}

Produce the JSON object containing the complete markdown implementation prompt.`;
}
