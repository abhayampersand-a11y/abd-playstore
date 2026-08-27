'use client';

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/common/States';
import type { AppError } from '@/lib/errors';

interface GenerateGateProps {
  title: string;
  description: string;
  buttonLabel: string;
  runningLabel: string;
  /** What the user gets. Rendered as a short list under the description. */
  bullets?: string[];
  loading: boolean;
  error: AppError | null;
  onGenerate: () => void;
  icon?: ReactNode;
  estimate?: string;
}

/**
 * The gate in front of every AI-backed stage.
 *
 * These calls cost real money, so they are never fired automatically on
 * navigation - the user asks for them, and the card says up front what they
 * will get and roughly how long it takes.
 */
export function GenerateGate({
  title,
  description,
  buttonLabel,
  runningLabel,
  bullets,
  loading,
  error,
  onGenerate,
  icon,
  estimate = 'Usually 20-60 seconds',
}: GenerateGateProps) {
  return (
    <Stack spacing={2.5}>
      <Card
        sx={(theme) => ({
          p: { xs: 3, sm: 4.5 },
          textAlign: 'center',
          borderColor: alpha(theme.palette.primary.main, 0.28),
          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04),
        })}
      >
        <Stack alignItems="center" spacing={2}>
          <Box
            aria-hidden
            sx={(theme) => ({
              width: 52,
              height: 52,
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.11),
              '& svg': { fontSize: 26 },
            })}
          >
            {icon ?? <AutoAwesomeRoundedIcon />}
          </Box>

          <Box>
            <Typography variant="h3" component="p">
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 560, mx: 'auto' }}>
              {description}
            </Typography>
          </Box>

          {bullets && bullets.length > 0 ? (
            <Stack
              component="ul"
              spacing={0.625}
              sx={{ m: 0, p: 0, listStyle: 'none', textAlign: 'left', maxWidth: 460 }}
            >
              {bullets.map((bullet) => (
                <Stack component="li" key={bullet} direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    aria-hidden
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      mt: '8px',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {bullet}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : null}

          <Button
            variant="contained"
            size="large"
            onClick={onGenerate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
          >
            {loading ? runningLabel : buttonLabel}
          </Button>

          {loading ? (
            <Box sx={{ width: '100%', maxWidth: 420 }}>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {estimate}. Leaving this page will cancel the request.
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {estimate} · uses your AI provider key
            </Typography>
          )}
        </Stack>
      </Card>

      {error ? <ErrorState error={error} onRetry={onGenerate} retryLabel="Try again" /> : null}
    </Stack>
  );
}
