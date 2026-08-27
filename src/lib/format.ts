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
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
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
