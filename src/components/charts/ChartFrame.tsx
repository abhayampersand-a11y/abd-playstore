'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartFrameProps {
  /** Names the measure, so a single-series chart needs no legend box. */
  title?: string;
  subtitle?: string;
  height?: number;
  children: ReactElement;
  /** Rendered under the plot - custom legends, footnotes, source lines. */
  footer?: ReactNode;
  action?: ReactNode;
}

export function ChartFrame({ title, subtitle, height = 260, children, footer, action }: ChartFrameProps) {
  return (
    <Box sx={{ width: '100%' }}>
      {title || action ? (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
          <Box>
            {title ? (
              <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
      ) : null}

      <Box sx={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </Box>

      {footer ? <Box sx={{ mt: 1.25 }}>{footer}</Box> : null}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/**
 * Shared tooltip shell. Values wear text ink; the series colour appears only as
 * a small swatch beside the label, never as the text colour itself.
 */
export function ChartTooltipCard({ title, rows }: { title?: string; rows: TooltipRow[] }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderRadius: 2,
        px: 1.5,
        py: 1.125,
        minWidth: 150,
        maxWidth: 280,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: `0 8px 24px ${alpha('#000', theme.palette.mode === 'dark' ? 0.5 : 0.12)}`,
      }}
    >
      {title ? (
        <Typography variant="caption" sx={{ fontWeight: 650, display: 'block', mb: rows.length ? 0.75 : 0 }}>
          {title}
        </Typography>
      ) : null}
      <Stack spacing={0.5}>
        {rows.map((row) => (
          <Stack key={row.label} direction="row" alignItems="center" spacing={1} justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
              {row.color ? (
                <Box
                  aria-hidden
                  sx={{ width: 9, height: 9, borderRadius: '3px', backgroundColor: row.color, flexShrink: 0 }}
                />
              ) : null}
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.label}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
              {row.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

/** Shared axis/grid styling so every chart in the app reads as one system. */
export function useAxisProps() {
  const theme = useTheme();
  const muted = theme.palette.mode === 'dark' ? '#898781' : '#898781';

  return {
    tick: { fill: muted, fontSize: 11 },
    axisLine: { stroke: theme.palette.mode === 'dark' ? '#383835' : '#c3c2b7' },
    tickLine: false as const,
    grid: { stroke: theme.palette.mode === 'dark' ? '#2c2c2a' : '#e1e0d9', strokeDasharray: '0' },
  };
}

/** Legend swatch row used where a chart genuinely has two or more series. */
export function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.75 }}>
      {items.map((item) => (
        <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
          <Box
            aria-hidden
            sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: item.color, flexShrink: 0 }}
          />
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
