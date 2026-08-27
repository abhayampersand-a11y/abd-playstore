'use client';

import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { formatDate, plainNumber } from '@/lib/format';
import type { ReviewQuote } from '@/lib/types';
import { EmptyState } from '@/components/common/States';

/**
 * Verbatim reviews.
 *
 * Percentages tell a developer how big a problem is; the actual sentence tells
 * them what the problem *is*. Both are needed, so every theme chart in the app
 * is paired with the quotes behind it.
 */
export function QuoteList({
  quotes,
  tone = 'negative',
  max = 6,
  emptyMessage = 'No reviews of this kind were found.',
}: {
  quotes: ReviewQuote[];
  tone?: 'negative' | 'positive' | 'request';
  max?: number;
  emptyMessage?: string;
}) {
  if (quotes.length === 0) {
    return <EmptyState icon={<FormatQuoteRoundedIcon />} title="Nothing to quote" description={emptyMessage} compact />;
  }

  return (
    <Stack spacing={1.5}>
      {quotes.slice(0, max).map((quote, index) => (
        <Box
          key={`${quote.appId}-${index}`}
          sx={(theme) => ({
            p: 1.75,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: alpha(
              tone === 'negative'
                ? theme.palette.error.main
                : tone === 'positive'
                  ? theme.palette.success.main
                  : theme.palette.primary.main,
              theme.palette.mode === 'dark' ? 0.07 : 0.035,
            ),
          })}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.65, fontStyle: 'italic' }}>
            “{quote.text}”
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.25, flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={0.25} alignItems="center">
              <StarRoundedIcon sx={{ fontSize: 13, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 650 }}>
                {quote.score}
              </Typography>
            </Stack>

            {quote.appTitle ? (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                {quote.appTitle}
              </Typography>
            ) : null}

            {quote.thumbsUp && quote.thumbsUp > 0 ? (
              <Stack direction="row" spacing={0.375} alignItems="center">
                <ThumbUpAltRoundedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  {plainNumber(quote.thumbsUp)}
                </Typography>
              </Stack>
            ) : null}

            {quote.date ? (
              <Typography variant="caption" color="text.disabled">
                {formatDate(quote.date)}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
