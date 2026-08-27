'use client';

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';

import { nextAction, stageHref } from '@/lib/research/stages';
import type { ResearchRecord } from '@/lib/types';

/**
 * The forward momentum of the flow. Every stage page ends with one, so the
 * user is never left on a page wondering what to do next.
 */
export function NextStepCard({ record }: { record: ResearchRecord }) {
  const action = nextAction(record);
  if (!action) return null;

  return (
    <Card
      sx={(theme) => ({
        mt: 3,
        p: 2.75,
        borderColor: alpha(theme.palette.primary.main, 0.3),
        backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.045),
      })}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <AutoAwesomeRoundedIcon sx={{ color: 'primary.main', fontSize: 20, mt: '2px' }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Next: {action.stage.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {action.stage.description}
            </Typography>
          </Box>
        </Stack>

        <Button
          component={NextLink}
          href={stageHref(record.id, action.stage)}
          variant="contained"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ flexShrink: 0 }}
        >
          {action.label}
        </Button>
      </Stack>
    </Card>
  );
}
