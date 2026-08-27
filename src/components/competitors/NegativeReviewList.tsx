'use client';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/States';
import { formatDate, plainNumber } from '@/lib/format';
import type { CleanReview } from '@/lib/types';

/**
 * Every negative review for one app.
 *
 * A list this long is only useful if it can be interrogated, so it ships with a
 * text filter and a star filter and renders in pages - eight hundred cards laid
 * out at once costs a visible pause on every keystroke, and nobody reads them
 * in one scroll anyway.
 */

const PAGE_SIZE = 50;

type StarFilter = 'all' | '1' | '2';

export function NegativeReviewList({
  reviews,
  scanned,
  truncated,
}: {
  reviews: CleanReview[];
  scanned: number;
  truncated: boolean;
}) {
  const [query, setQuery] = useState('');
  const [stars, setStars] = useState<StarFilter>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reviews.filter((review) => {
      if (stars !== 'all' && review.score !== Number(stars)) return false;
      return needle.length === 0 || review.text.toLowerCase().includes(needle);
    });
  }, [reviews, query, stars]);

  // Any change to the filters starts the list from the top again.
  const resetTo = (apply: () => void) => {
    apply();
    setVisible(PAGE_SIZE);
  };

  const oneStar = useMemo(() => reviews.filter((review) => review.score === 1).length, [reviews]);

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" color="text.secondary">
          <strong>{plainNumber(reviews.length)}</strong> negative {reviews.length === 1 ? 'review' : 'reviews'} from{' '}
          {plainNumber(scanned)} read · {plainNumber(oneStar)} at one star
        </Typography>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={stars}
          onChange={(_event, next: StarFilter | null) => next && resetTo(() => setStars(next))}
        >
          <ToggleButton value="all" sx={{ px: 1.5 }}>
            All
          </ToggleButton>
          <ToggleButton value="1" sx={{ px: 1.5 }}>
            1★
          </ToggleButton>
          <ToggleButton value="2" sx={{ px: 1.5 }}>
            2★
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {truncated ? (
        <Alert severity="info">
          Play kept serving more pages than one sweep reads, so these are the complaints from the most recent
          reviews — enough to size every recurring problem, but not literally every negative review ever written.
        </Alert>
      ) : null}

      <TextField
        value={query}
        onChange={(event) => resetTo(() => setQuery(event.target.value))}
        placeholder="Filter by word — try “ads”, “crash”, “subscription”"
        size="small"
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 19 }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SentimentDissatisfiedRoundedIcon />}
          title="Nothing matches that filter"
          description="Try a different word, or clear the filter to see every negative review."
          compact
        />
      ) : (
        <>
          {query.trim() || stars !== 'all' ? (
            <Typography variant="caption" color="text.secondary">
              {plainNumber(filtered.length)} of {plainNumber(reviews.length)} match
            </Typography>
          ) : null}

          <Stack spacing={1.5}>
            {filtered.slice(0, visible).map((review, index) => (
              <ReviewCard key={`${review.date ?? 'undated'}-${index}`} review={review} />
            ))}
          </Stack>

          {visible < filtered.length ? (
            <Button variant="outlined" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
            </Button>
          ) : null}
        </>
      )}
    </Stack>
  );
}

function ReviewCard({ review }: { review: CleanReview }) {
  return (
    <Box
      sx={(theme) => ({
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(theme.palette.error.main, 0.22),
        backgroundColor: alpha(theme.palette.error.main, 0.04),
      })}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
        <Chip
          size="small"
          icon={<StarRoundedIcon sx={{ fontSize: 14 }} />}
          label={review.score}
          color="error"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }}
        />
        {review.date ? (
          <Typography variant="caption" color="text.secondary">
            {formatDate(review.date)}
          </Typography>
        ) : null}
        {review.thumbsUp ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <ThumbUpAltRoundedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              {plainNumber(review.thumbsUp)}
            </Typography>
          </Stack>
        ) : null}
        {review.version ? (
          <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }} noWrap>
            v{review.version}
          </Typography>
        ) : null}
      </Stack>

      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
        {review.text}
      </Typography>
    </Box>
  );
}
