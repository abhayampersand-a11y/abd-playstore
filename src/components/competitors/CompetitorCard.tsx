'use client';

import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { compactNumber, formatDate, rating, truncate } from '@/lib/format';
import type { Competitor } from '@/lib/types';
import { AppIcon } from './AppIcon';

/**
 * Card form of a competitor. Screenshots are shown when the listing has them -
 * they are often the fastest way to judge how dated an incumbent looks, which
 * is exactly the kind of gap this product exists to surface.
 */
export function CompetitorCard({
  competitor,
  onSelect,
}: {
  competitor: Competitor;
  onSelect?: (competitor: Competitor) => void;
}) {
  const body = (
    <Box sx={{ p: 2.25, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <AppIcon src={competitor.icon} title={competitor.title} size={46} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 650, lineHeight: 1.35 }} noWrap>
            {competitor.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {competitor.developer}
          </Typography>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 0.625 }}>
            <Stack direction="row" spacing={0.25} alignItems="center">
              <StarRoundedIcon sx={{ fontSize: 14, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 650 }}>
                {rating(competitor.score)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {compactNumber(competitor.ratingCount)} ratings
            </Typography>
          </Stack>
        </Box>
      </Stack>

      {competitor.summary ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.55 }}>
          {truncate(competitor.summary, 108)}
        </Typography>
      ) : null}

      {competitor.screenshots.length > 0 ? (
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.75, overflow: 'hidden' }}>
          {competitor.screenshots.slice(0, 3).map((screenshot) => (
            <Box
              key={screenshot}
              component="img"
              src={screenshot}
              alt=""
              loading="lazy"
              sx={{
                width: 52,
                height: 92,
                objectFit: 'cover',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'surface.sunken',
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>
      ) : null}

      <Stack direction="row" spacing={0.625} flexWrap="wrap" useFlexGap sx={{ mt: 'auto', pt: 1.75, rowGap: 0.625 }}>
        <Chip label={competitor.installs ?? compactNumber(competitor.minInstalls)} size="small" variant="outlined" />
        <Chip
          label={competitor.free ? 'Free' : (competitor.priceText ?? 'Paid')}
          size="small"
          variant="outlined"
        />
        {competitor.offersIAP ? <Chip label="IAP" size="small" variant="outlined" /> : null}
        {competitor.adSupported ? (
          <Chip
            icon={<CampaignRoundedIcon sx={{ fontSize: 13 }} />}
            label="Ads"
            size="small"
            variant="outlined"
          />
        ) : null}
      </Stack>

      <Typography variant="caption" color="text.disabled" sx={{ mt: 1.25 }}>
        Updated {formatDate(competitor.updated)}
      </Typography>
    </Box>
  );

  return (
    <Card sx={{ height: '100%' }}>
      {onSelect ? (
        <CardActionArea
          onClick={() => onSelect(competitor)}
          sx={{ height: '100%', alignItems: 'stretch' }}
          aria-label={`View analysis for ${competitor.title}`}
        >
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}
