'use client';

import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useEffect } from 'react';

/** Route-level error boundary. Recoverable by design - `reset` re-renders. */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[appscout] Unhandled UI error:', error);
  }, [error]);

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', py: 6 }}>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Box
            aria-hidden
            sx={(theme) => ({
              width: 52,
              height: 52,
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              color: theme.palette.error.main,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(208,59,59,0.18)' : 'rgba(208,59,59,0.1)',
            })}
          >
            <ReportProblemRoundedIcon />
          </Box>

          <Typography variant="h3" component="h1">
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error.message || 'An unexpected error occurred while rendering this page.'}
          </Typography>
          {error.digest ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'ui-monospace, monospace' }}>
              {error.digest}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
            <Button onClick={reset} variant="contained" startIcon={<RefreshRoundedIcon />}>
              Try again
            </Button>
            <Button component={NextLink} href="/" variant="outlined">
              Back to dashboard
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}
