'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { bandOf } from '@/lib/research/scoring';
import type { Recommendation } from '@/lib/types';

// ---------------------------------------------------------------------------
// Recommendation badge
// ---------------------------------------------------------------------------

const TONE_ICON = {
  good: CheckCircleRoundedIcon,
  warning: WarningRoundedIcon,
  critical: ErrorRoundedIcon,
} as const;

/**
 * The traffic-light verdict. Status colour never carries the meaning alone -
 * the icon and the label always ship with it, which is what keeps it readable
 * for colour-blind users and in forced-colors mode.
 */
export function RecommendationBadge({
  recommendation,
  size = 'medium',
}: {
  recommendation: Recommendation;
  size?: 'small' | 'medium' | 'large';
}) {
  const theme = useTheme();
  const band = bandOf(recommendation);
  const Icon = TONE_ICON[band.tone];

  const color =
    band.tone === 'good'
      ? theme.palette.success.main
      : band.tone === 'warning'
        ? theme.palette.warning.main
        : theme.palette.error.main;

  const scale = size === 'large' ? 1 : size === 'small' ? 0.75 : 0.86;

  return (
    <Stack
      direction="row"
      spacing={0.875}
      alignItems="center"
      sx={{
        display: 'inline-flex',
        borderRadius: 999,
        px: `${14 * scale}px`,
        py: `${7 * scale}px`,
        backgroundColor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.11),
        border: `1px solid ${alpha(color, 0.32)}`,
      }}
    >
      <Icon sx={{ fontSize: `${18 * scale}px`, color }} />
      <Typography
        component="span"
        sx={{ fontWeight: 650, fontSize: `${0.875 * scale}rem`, color, whiteSpace: 'nowrap' }}
      >
        {band.label}
      </Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Score bar
// ---------------------------------------------------------------------------

interface ScoreBarProps {
  label: string;
  value: number;
  description?: string;
  highMeans?: string;
  emphasis?: boolean;
}

/**
 * A 0-10 score as a thin bar with a 4px rounded data-end anchored to the
 * baseline. The number is direct-labelled rather than tucked into a tooltip -
 * five scores is few enough that labelling every one is the right call.
 */
export function ScoreBar({ label, value, description, highMeans, emphasis = false }: ScoreBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));

  const color = emphasis
    ? theme.palette.primary.main
    : value >= 7
      ? theme.palette.success.main
      : value >= 4.5
        ? theme.palette.warning.main
        : theme.palette.error.main;

  const bar = (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.625 }}>
        <Typography variant="body2" sx={{ fontWeight: emphasis ? 650 : 550 }}>
          {label}
        </Typography>
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            fontSize: emphasis ? '1.0625rem' : '0.9375rem',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value.toFixed(1)}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.25 }}>
            /10
          </Typography>
        </Typography>
      </Stack>

      <Box
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${label}: ${value.toFixed(1)} out of 10`}
        sx={{
          position: 'relative',
          height: emphasis ? 10 : 7,
          borderRadius: 999,
          backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.07),
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            borderRadius: 999,
            backgroundColor: color,
            transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </Box>

      {description ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.625 }}>
          {description}
        </Typography>
      ) : null}
    </Box>
  );

  return highMeans ? (
    <Tooltip title={`High score means: ${highMeans}`} placement="top-start" arrow>
      {bar}
    </Tooltip>
  ) : (
    bar
  );
}

// ---------------------------------------------------------------------------
// Opportunity dial
// ---------------------------------------------------------------------------

/**
 * The headline opportunity score. A single hero figure with a radial track -
 * deliberately not a chart, because there is exactly one number to read.
 */
export function ScoreDial({
  value,
  recommendation,
  size = 168,
}: {
  value: number;
  recommendation: Recommendation;
  size?: number;
}) {
  const theme = useTheme();
  const band = bandOf(recommendation);
  const color =
    band.tone === 'good'
      ? theme.palette.success.main
      : band.tone === 'warning'
        ? theme.palette.warning.main
        : theme.palette.error.main;

  const stroke = Math.round(size * 0.075);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, value / 10));

  return (
    <Box
      sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      role="img"
      aria-label={`Opportunity score ${value.toFixed(1)} out of 10 — ${band.label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.11 : 0.08)}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>

      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ position: 'absolute', inset: 0, textAlign: 'center' }}
      >
        <Typography
          component="span"
          sx={{ fontSize: size * 0.3, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          {value.toFixed(1)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
          out of 10
        </Typography>
      </Stack>
    </Box>
  );
}
