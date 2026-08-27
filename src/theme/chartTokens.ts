'use client';

import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';

/**
 * Chart colour tokens.
 *
 * The categorical order is fixed and never cycled - slot N is always the same
 * hue, so a filter that removes a series does not repaint the survivors. The
 * dark column is the same eight hues re-stepped for the dark surface, not an
 * automatic flip of the light values.
 *
 * Status colours are reserved for good/warning/serious/critical and are never
 * reused as "series 5"; they always ship with an icon or a label so meaning is
 * never carried by colour alone.
 */

export interface ChartTokens {
  categorical: readonly string[];
  sequential: readonly string[];
  diverging: { low: string; mid: string; high: string };
  status: { good: string; warning: string; serious: string; critical: string };
  surface: string;
  grid: string;
  axis: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
}

const LIGHT: ChartTokens = {
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  sequential: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95'],
  diverging: { low: '#d03b3b', mid: '#f0efec', high: '#2a78d6' },
  status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
  surface: '#ffffff',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
  inkMuted: '#898781',
};

const DARK: ChartTokens = {
  categorical: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  sequential: ['#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#86b6ef', '#b7d3f6'],
  diverging: { low: '#d03b3b', mid: '#383835', high: '#3987e5' },
  status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
  surface: '#16171a',
  grid: '#2c2c2a',
  axis: '#383835',
  ink: '#ffffff',
  inkSecondary: '#c3c2b7',
  inkMuted: '#898781',
};

export function chartTokensFor(mode: 'light' | 'dark'): ChartTokens {
  return mode === 'dark' ? DARK : LIGHT;
}

export function useChartTokens(): ChartTokens {
  const theme = useTheme();
  return useMemo(() => chartTokensFor(theme.palette.mode), [theme.palette.mode]);
}

/**
 * Colour ramp for a 1★→5★ histogram. This is an *ordinal* scale, so it uses
 * the diverging pair (bad→good) rather than eight unrelated hues: the reader
 * should see polarity, not five separate categories.
 */
export function useHistogramColors(): string[] {
  const tokens = useChartTokens();
  return useMemo(
    () => [
      tokens.status.critical,
      tokens.status.serious,
      tokens.status.warning,
      tokens.categorical[2] ?? '#1baf7a',
      tokens.status.good,
    ],
    [tokens],
  );
}

/** Sentiment is a fixed three-state scale, not a series - keep it stable. */
export function useSentimentColors(): { positive: string; neutral: string; negative: string } {
  const tokens = useChartTokens();
  return useMemo(
    () => ({
      positive: tokens.status.good,
      neutral: tokens.inkMuted,
      negative: tokens.status.critical,
    }),
    [tokens],
  );
}
