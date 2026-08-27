# AppScout AI

AI-powered Google Play Store app opportunity research.

AppScout answers one question: **which mobile app should I build that has real demand, manageable competition, clear user problems, strong differentiation opportunities, and realistic monetization potential?**

You give it a keyword. It searches Google Play, maps the competition, mines what users actually complain about, asks an AI model whether there is a real gap — and if there is, it writes the product plan and the engineering brief to build it.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then add your free Gemini API key
npm run dev
```

Open http://localhost:3000.

Scraping works without an API key. The three AI stages (opportunity analysis, build plan, development prompt) need `GEMINI_API_KEY` set — free, no card, from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). See [AI provider](#ai-provider) to use Claude instead.

> **Versions.** `@google/genai` `^2.19.0` and `@anthropic-ai/sdk` `^0.121.0`, verified against Node 26.7.0, Next 15.5.24, MUI 7.3.11 and React 19.2.8.

---

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | For AI stages | — | Google AI Studio key, free tier. **Server-only.** |
| `CLAUDE_API_KEY` | Alternative | — | Anthropic key, paid per token. **Server-only.** |
| `AI_PROVIDER` | No | auto | `gemini` \| `anthropic`. Auto-selects Gemini first. |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Model for every analysis call. |
| `CLAUDE_MODEL` | No | `claude-opus-5` | Model when running on Anthropic. |
| `AI_EFFORT` | No | `high` | `low` \| `medium` \| `high` \| `xhigh` \| `max`. |
| `MAX_COMPETITOR_DETAIL` | No | `12` | Ceiling on detailed listing fetches per run. |
| `MAX_REVIEWS_PER_APP` | No | `200` | Ceiling on reviews pulled per competitor. |
| `AUTH_USERNAME` | To require sign-in | — | The one account allowed in. |
| `AUTH_PASSWORD` | To require sign-in | — | Its password. **Server-only.** |
| `AUTH_SECRET` | No | derived | Key that signs the session cookie. |
| `DATABASE_URL` | No | — | PostgreSQL / Neon, for future server-side persistence. |

**Never prefix an API key with `NEXT_PUBLIC_`.** That would publish it to every visitor's browser. `src/lib/server-env.ts` and every file under `src/lib/ai/providers/` start with `import 'server-only'`, which turns importing them from a client component into a build error — that is the mechanism, not a convention.

---

## AI provider

The three AI stages run behind one interface (`src/lib/ai/providers/`), so the provider is an environment choice rather than a code change. Scraping never touches it — searching Play, pulling listings and mining reviews all work with no key at all.

| | Google Gemini | Anthropic Claude |
|---|---|---|
| Cost | Free tier, no card | Paid per token, prepaid credits |
| Default model | `gemini-3.6-flash` | `claude-opus-5` |
| Get a key | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | [console.anthropic.com](https://console.anthropic.com) |
| Limits | Per-minute and per-day caps | Spend cap you set |
| Quality on this task | Good — analysis holds up well | Better, most visibly on the build plan |

**Gemini is the default.** With no `AI_PROVIDER` set, whichever key is present wins and Gemini is checked first — so a server holding both keys never starts spending money by accident. Set `AI_PROVIDER=anthropic` to override.

Two things to know about the free tier: Google may use free-tier requests to improve their models, and the daily cap is real — a heavy research day can hit it, which surfaces as a rate-limit error with a retry hint.

Adding a third provider means one file implementing `LlmProvider` and one line in `PROVIDERS`. The pipeline states what it needs — a system prompt, a user message, a zod schema — and the adapter decides how to ask for it.

---

## Sign-in

There is no user table and no sign-up. `AUTH_USERNAME` and `AUTH_PASSWORD` define the single account, so who may use a deployment is a deployment decision.

`src/middleware.ts` is the gate. It runs ahead of every page and every API route — including the expensive scraping and AI endpoints — so a new route cannot accidentally become an unauthenticated entry point. Signing in exchanges the credentials for an HMAC-signed, HTTP-only cookie that lasts seven days; no script on the page can read it, and a tampered payload fails the signature check.

Two behaviours are worth knowing:

- **Unconfigured development runs open**, so a fresh clone starts without ceremony. **Unconfigured production is locked**, not exposed — the login screen says what is missing instead of serving the app to the internet.
- **Changing `AUTH_PASSWORD` signs out every existing session**, because with no explicit `AUTH_SECRET` the signing key is derived from the credentials. Set `AUTH_SECRET` if you would rather sessions survive a password change.

Failed sign-in attempts are throttled per client address (8 per 10 minutes, in memory). That stops an online guessing loop; a long passphrase is what stops everything else.

---

## The flow

```
SEARCH → COMPETITORS → REVIEWS → MARKET ANALYSIS → OPPORTUNITY → BUILD PLAN → DEV PROMPT
```

Every research gets its own workspace at `/research/[id]`, and the stage rail at the top shows what is done, what you are looking at, and what is still locked.

1. **Search** — market aggregates, competitive landscape, monetisation mix.
2. **Competitors** — every app, as a sortable table or cards. Click through for a full breakdown.
3. **Review Intelligence** — complaints, praise and feature requests, each with the verbatim reviews behind the percentage.
4. **AI Opportunity** — six 0-10 scores, a GREEN/YELLOW/RED verdict, and the reasoning.
5. **Build Plan** — MVP scope, screens, architecture, schema, monetisation, launch plan.
6. **Dev Prompt** — a self-contained brief for an AI coding assistant, with a Copy button.

---

## Architecture

```
Browser
  │
  ├─ POST /api/research      → google-play-scraper → normalise → dedupe → rank
  │                            → fetch details → fetch reviews → clean → group
  │                            → theme extraction → aggregates
  │
  ├─ POST /api/analyze       → compact payload → model → zod validation → scores
  ├─ POST /api/build-plan    → analysis        → model → zod validation → plan
  ├─ POST /api/dev-prompt    → plan            → model → zod validation → markdown
  └─ POST /api/competitor    → on-demand single-app deep dive
```

The provider key lives only in the Node process. The browser talks to `/api/*`; it never talks to the model provider directly.

### Token and cost control

Sending raw reviews to a model would be slow, expensive, and worse. Instead the pipeline does the counting locally and sends the model the *evidence*:

- A rule-based theme taxonomy (`src/lib/playstore/themes.ts`) classifies complaints, praise and feature requests. It is deterministic, so two researches on the same keyword are comparable.
- `buildAnalysisPayload` projects the full dataset (~200KB) down to theme histograms plus a bounded sample of verbatim quotes — roughly 4-6K input tokens **regardless of how many reviews were scraped**.
- The system prompts are frozen strings. On Anthropic they are marked `cache_control: ephemeral` so repeat analyses read them from cache; on Gemini the same stability lets implicit caching do the equivalent job.
- Trimming happens on the server, so a caller cannot inflate the prompt.

### Validating model output

Every model response is validated twice: once as a structured-output format, and again with `schema.safeParse` before anything renders. If the SDK/zod pairing cannot produce a format descriptor, the call degrades to prompt-enforced JSON with fence-stripping and brace-matching recovery — and the same zod validation still gates the render. A malformed response produces a clean error state, never a half-rendered page.

The traffic-light band is derived locally from `opportunityScore` rather than trusted from the response, so the badge and the number can never contradict each other on screen.

---

## Project layout

```
prisma/schema.prisma          Postgres/Neon schema - one Research table
src/app/                      Routes and API handlers
  api/research                Scrape + clean pipeline
  api/analyze                 AI opportunity analysis
  api/build-plan              AI product plan
  api/dev-prompt              AI coding brief
  api/competitor              Single-app deep dive
  api/health                  Config status (never returns the key)
  api/records                 Persisted research (Postgres store)
  api/auth/…                  Sign in and sign out
  login/                      Sign-in screen (the only public page)
  research/[id]/…             The six-stage workspace
src/components/               Charts, layout, stage views, shared primitives
src/middleware.ts             The auth gate, ahead of every route
src/lib/
  auth/                       Session cookie, credentials, server helpers
  playstore/                  Scraping, normalisation, review mining
  ai/                         Prompts, schemas, analysis calls
    providers/                Gemini + Anthropic adapters behind one interface
  research/                   Pipeline, scoring, stages, runner hook
  store/                      Repository contract + local, remote and Prisma impls
  types.ts                    The domain contract
src/theme/                    MUI theme + validated chart palette
```

---

## Data storage

Two interchangeable stores sit behind one six-method contract (`src/lib/store/repository.ts`). Which one runs is decided by whether `DATABASE_URL` is set — resolved on the server and passed into `ResearchStoreProvider`, so the first render already knows where data lives.

**Browser (default, zero infrastructure).** The index and the records live under separate keys so list views stay fast, and a quota-exceeded write evicts the oldest *unsaved* research and retries — bookmarked ideas are never evicted. Research does not follow you to another device.

**Postgres / Neon.** Set `DATABASE_URL` and run `npm run prisma:push`. Research is then scoped to the signed-in account and reachable from anywhere you sign in.

```bash
DATABASE_URL="postgresql://..."   # in .env
npm run prisma:push
```

A Prisma client cannot run in the browser, so the client-side store reaches it through `/api/records` — `RemoteResearchRepository` is the client half, `PrismaResearchRepository` the server half, and both satisfy the same interface. No page or component knows which is in play.

**One table, deliberately.** A `ResearchRecord` is a self-contained document, and the other two shapes the UI needs — `ResearchListItem` and `SavedIdea` — are *derived* from it. Tables of their own would duplicate data that already exists and create a second way for the same fact to be wrong. So the record is stored whole as JSONB, and only the fields list views sort or display are promoted to columns, which is what lets `list()` read a few hundred bytes per row instead of the ~200KB document.

**Existing local research is copied up automatically** on the first load after a database is configured (`src/lib/store/migrate.ts`). It copies rather than moves — the browser copy is left intact, so a partial migration costs nothing and simply retries. Rows the server already has are never overwritten by a stale local copy.

**Ownership is structural.** Every query filters on `owner` (the signed-in username, or `local` when sign-in is off), and saves use a scoped `updateMany`-then-create rather than a bare upsert — so a guessed id cannot overwrite another account's row.

---

## Design notes

The chart layer follows a single system rather than per-chart taste:

- Categorical hues are assigned in **fixed order, never cycled**, so removing a series never repaints the survivors.
- Dark mode has its **own** steps chosen for the dark surface — not an inverted light palette.
- Star histograms and sentiment use the **ordinal/status** ramp, not categorical hues: the reader should see polarity, not five unrelated categories.
- Status colours (good/warning/critical) are reserved, never reused as a series, and **always** ship with an icon or a label so meaning is never carried by colour alone.
- Single-series charts carry no legend — the title names the measure.
- Wide content (tables, charts) scrolls inside its own container; the page body never scrolls sideways.
- There are no dual-axis charts anywhere.

---

## Error handling

Every failure mode is a typed code in `src/lib/errors.ts` with user-facing copy and a recovery hint: missing API key, no apps found, no reviews found, Play throttling, provider rate limits, invalid JSON, refusals, network failures, timeouts.

Two behaviours worth knowing:

- **A failed AI call does not lose your scrape.** The dataset is persisted before the analysis runs, so a missing key or a rate limit leaves you with the full competitor and review intelligence, and a retry button that re-runs only the analysis.
- **One bad listing does not fail a run.** Unavailable apps and review-less apps become warnings, surfaced on the progress screen and the overview.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:push` | Push the schema to `DATABASE_URL` |

---

## Notes and limits

- **Google Play scraping is unofficial.** It works by parsing Play's web responses, so it can break when Play changes its markup, and Play rate-limits bursts. The pipeline caps concurrency at 3, sets per-call timeouts, and surfaces throttling as a retryable error.
- **Review language matters.** Reviews are mined in the language you select. Picking a language that does not match the market yields thin results.
- **Scores are judgement, not measurement.** They are grounded in real listing and review evidence, and the prompt pushes hard for honest calibration and for "do not build this" where that is the right answer — but they are still a model's opinion. The evidence pages exist so you can check the reasoning rather than trust the number.
