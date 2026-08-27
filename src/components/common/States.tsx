'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { ERROR_COPY, type AppError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{ textAlign: 'center', py: compact ? 4 : 7, px: 3 }}
    >
      {icon ? (
        <Box
          sx={(theme) => ({
            width: 48,
            height: 48,
            borderRadius: '14px',
            display: 'grid',
            placeItems: 'center',
            color: 'text.secondary',
            backgroundColor: alpha(theme.palette.text.primary, 0.045),
          })}
        >
          {icon}
        </Box>
      ) : null}
      <Typography variant="h5" component="p">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ pt: 0.5 }}>{action}</Box> : null}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  error: AppError | Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

function readError(error: AppError | Error): { title: string; message: string; hint?: string; retryable: boolean } {
  const maybeApp = error as AppError;
  if (typeof maybeApp.code === 'string' && maybeApp.code in ERROR_COPY) {
    const copy = ERROR_COPY[maybeApp.code];
    return {
      title: copy.title,
      message: maybeApp.message,
      hint: maybeApp.hint ?? copy.hint,
      retryable: maybeApp.retryable ?? true,
    };
  }
  return {
    title: ERROR_COPY.UNKNOWN.title,
    message: error.message || ERROR_COPY.UNKNOWN.title,
    hint: ERROR_COPY.UNKNOWN.hint,
    retryable: true,
  };
}

export function ErrorState({ error, onRetry, retryLabel = 'Try again', compact = false }: ErrorStateProps) {
  if (!error) return null;
  const { title, message, hint, retryable } = readError(error);

  return (
    <Alert
      severity="error"
      variant="outlined"
      sx={{ borderRadius: 3, ...(compact ? {} : { p: 2 }) }}
      action={
        onRetry && retryable ? (
          <Button color="error" size="small" onClick={onRetry} sx={{ mt: 0.25 }}>
            {retryLabel}
          </Button>
        ) : undefined
      }
    >
      <AlertTitle sx={{ fontWeight: 700 }}>{title}</AlertTitle>
      <Typography variant="body2">{message}</Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {hint}
        </Typography>
      ) : null}
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

export function CardSkeleton({ height = 160 }: { height?: number }) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Skeleton variant="text" width="42%" height={26} />
      <Skeleton variant="text" width="66%" height={18} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={height} />
    </Card>
  );
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: `repeat(${count}, 1fr)` },
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} sx={{ p: 2.5 }}>
          <Skeleton variant="text" width="55%" height={16} />
          <Skeleton variant="text" width="35%" height={40} />
          <Skeleton variant="text" width="70%" height={14} />
        </Card>
      ))}
    </Box>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Stack spacing={1.25} sx={{ p: 2.5 }}>
      {Array.from({ length: rows }, (_, index) => (
        <Stack key={index} direction="row" spacing={2} alignItems="center">
          <Skeleton variant="rounded" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="45%" height={18} />
            <Skeleton variant="text" width="28%" height={14} />
          </Box>
          <Skeleton variant="text" width={60} height={18} />
          <Skeleton variant="text" width={70} height={18} />
        </Stack>
      ))}
    </Stack>
  );
}

export function TextBlockSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <Stack spacing={0.75}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} variant="text" height={16} width={index === lines - 1 ? '62%' : '100%'} />
      ))}
    </Stack>
  );
}
