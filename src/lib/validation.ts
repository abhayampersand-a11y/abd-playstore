import { z } from 'zod';

/**
 * Request validation shared by the API routes and the research form, so the
 * client cannot submit anything the server would reject.
 */

export const COMPETITOR_MIN = 5;
export const COMPETITOR_MAX = 20;
export const REVIEW_MIN = 40;
export const REVIEW_MAX = 600;

export const researchInputSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(80, 'Keep the keyword under 80 characters')
    .regex(/[\p{L}\p{N}]/u, 'Enter a real app idea or keyword'),
  country: z
    .string()
    .trim()
    .toLowerCase()
    .length(2, 'Country must be a 2-letter code'),
  language: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Language must be a 2-letter code')
    .max(5, 'Language must be a 2-letter code'),
  // Plain `number`, not `z.coerce.number()`: coercion makes the schema's input
  // and output types diverge, which breaks the react-hook-form resolver typing.
  // Both callers (the sliders and the JSON API body) already send numbers.
  competitorCount: z.number().int().min(COMPETITOR_MIN).max(COMPETITOR_MAX),
  reviewCount: z.number().int().min(REVIEW_MIN).max(REVIEW_MAX),
});

export type ResearchInputValues = z.infer<typeof researchInputSchema>;

export const DEFAULT_RESEARCH_INPUT: ResearchInputValues = {
  keyword: '',
  country: 'in',
  language: 'en',
  competitorCount: 10,
  reviewCount: 150,
};

export interface Option {
  value: string;
  label: string;
}

/** Markets where Play Store review volume is high enough to mine reliably. */
export const COUNTRY_OPTIONS: Option[] = [
  { value: 'in', label: 'India' },
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'es', label: 'Spain' },
  { value: 'it', label: 'Italy' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'br', label: 'Brazil' },
  { value: 'mx', label: 'Mexico' },
  { value: 'ae', label: 'United Arab Emirates' },
  { value: 'sa', label: 'Saudi Arabia' },
  { value: 'sg', label: 'Singapore' },
  { value: 'id', label: 'Indonesia' },
  { value: 'ph', label: 'Philippines' },
  { value: 'my', label: 'Malaysia' },
  { value: 'jp', label: 'Japan' },
  { value: 'kr', label: 'South Korea' },
  { value: 'za', label: 'South Africa' },
  { value: 'ng', label: 'Nigeria' },
  { value: 'pk', label: 'Pakistan' },
  { value: 'bd', label: 'Bangladesh' },
];

export const LANGUAGE_OPTIONS: Option[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ar', label: 'Arabic' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ru', label: 'Russian' },
];

/** Starter ideas shown as chips on the research form. */
export const EXAMPLE_KEYWORDS: string[] = [
  'Expense Manager',
  'School Management',
  'Habit Tracker',
  'AI Photo Editor',
  'Invoice Generator',
  'Fitness App',
  'Recipe Planner',
  'Study Timer',
];

export function labelForCountry(code: string): string {
  return COUNTRY_OPTIONS.find((option) => option.value === code)?.label ?? code.toUpperCase();
}

export function labelForLanguage(code: string): string {
  return LANGUAGE_OPTIONS.find((option) => option.value === code)?.label ?? code.toUpperCase();
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

/**
 * Shared by the login form and `POST /api/auth/login`. The bounds exist to
 * reject junk cheaply, not to constrain what the account owner may choose -
 * the real credentials come from the environment, not from this schema.
 */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username').max(120, 'That username is too long'),
  password: z.string().min(1, 'Enter your password').max(200, 'That password is too long'),
});

export type LoginValues = z.infer<typeof loginSchema>;
