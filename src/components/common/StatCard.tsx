'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Small qualifier under the number. */
  caption?: ReactNode;
  icon?: ReactNode;
  /** Optional delta line. `tone` carries meaning, never colour alone. */
  delta?: { label: string; tone: 'good' | 'critical' | 'neutral' };
  /** Sparkline or mini-chart slot. */
  visual?: ReactNode;
}

/**
 * A stat tile is a *hero number*, not a chart: the value is the mark, so it
 * carries the emphasis and everything around it stays recessive ink. The value
 * uses proportional figures - tabular figures are for columns that must align.
 */
export function StatCard({ label, value, caption, icon, delta, visual }: StatCardProps) {
  return (
    <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
          {label}
        </Typography>
        {icon ? (
          <Box
            sx={(theme) => ({
              width: 30,
              height: 30,
              borderRadius: '9px',
              display: 'grid',
              placeItems: 'center',
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.09),
              flexShrink: 0,
              '& svg': { fontSize: 17 },
            })}
          >
            {icon}
          </Box>
        ) : null}
      </Stack>

      <Typography
        component="p"
        sx={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, mt: 0.5 }}
      >
        {value}
      </Typography>

      {caption ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {caption}
        </Typography>
      ) : null}

      {delta ? (
        <Typography
          variant="caption"
          sx={(theme) => ({
            mt: 0.75,
            fontWeight: 600,
            color:
              delta.tone === 'good'
                ? theme.palette.success.main
                : delta.tone === 'critical'
                  ? theme.palette.error.main
                  : theme.palette.text.secondary,
          })}
        >
          {delta.label}
        </Typography>
      ) : null}

      {visual ? <Box sx={{ mt: 'auto', pt: 1.5 }}>{visual}</Box> : null}
    </Card>
  );
}
