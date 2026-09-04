/** Presentation-layer formatting helpers. Pure, no locale surprises. */

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const PLAIN = new Intl.NumberFormat('en');

export function compactNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return COMPACT.format(value);
}

export function plainNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return PLAIN.format(value);
}

export function percent(value: number | undefined | null, digits = 0): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function rating(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(2);
}

export function score(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return formatter.format(seconds, 'second');
}

/** Days since an ISO date, or undefined when unparseable. */
export function daysSince(iso: string | undefined | null): number | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${sliceText(trimmed, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Cut a string to `max` UTF-16 code units without splitting a character.
 *
 * An emoji is two code units, so a plain `slice` can leave half of one behind.
 * That is not cosmetic: `JSON.stringify` renders the orphaned half as a lone
 * `\ud83d` escape, and Postgres rejects the whole document when the record is
 * saved. Every truncation of scraped text goes through here.
 */
export function sliceText(text: string, max: number): string {
  if (text.length <= max) return text;
  const last = text.charCodeAt(max - 1);
  // A high surrogate sitting on the cut has its other half on the far side.
  const end = last >= 0xd800 && last <= 0xdbff ? max - 1 : max;
  return text.slice(0, end);
}

/**
 * Drop surrogate halves that have lost their pair.
 *
 * The truncation above will not create one, but scraped HTML entities, upstream
 * text that was itself cut badly, and model output all can - and a single one
 * makes a record unstorable. Strings without any emoji at all, which is nearly
 * all of them, take the fast path out.
 */
export function stripLoneSurrogates(text: string): string {
  if (!/[\uD800-\uDFFF]/.test(text)) return text;

  let out = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text[index] + text[index + 1];
        index += 1;
      }
      continue; // unpaired high half - drop it
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue; // unpaired low half
    out += text[index];
  }
  return out;
}

export function initials(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
