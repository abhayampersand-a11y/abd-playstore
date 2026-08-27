'use client';

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

import { MarketLandscapeChart } from '@/components/charts/MarketLandscapeChart';
import { RatingDistributionChart } from '@/components/charts/RatingDistributionChart';
import { SectionCard } from '@/components/common/SectionCard';
import { StatCard } from '@/components/common/StatCard';
import { CompetitorCard } from '@/components/competitors/CompetitorCard';
import { compactNumber, percent, rating } from '@/lib/format';
import { useResearchWorkspace } from './ResearchWorkspaceProvider';
import { NextStepCard } from './NextStepCard';

/**
 * Stage 1 - what the search actually turned up.
 *
 * The job of this page is orientation: how big is this market, how good are the
 * incumbents, and how much of the field is monetising. It is all locally
 * computed, so it renders instantly and is available even when the AI is not
 * configured.
 */
export function ResearchOverview() {
  const { record } = useResearchWorkspace();
  if (!record) return null;

  const { marketStats: stats, competitors } = record;
  const topByInstalls = [...competitors]
    .sort((a, b) => (b.minInstalls ?? 0) - (a.minInstalls ?? 0))
    .slice(0, 4);

  return (
    <Box>
      <Stack spacing={3}>
        {record.status === 'failed' ? (
          <Alert severity="warning">
            <AlertTitle sx={{ fontWeight: 700 }}>AI analysis did not complete</AlertTitle>
            {record.error ?? 'The AI analysis failed on the last run.'} The Google Play data below was collected
            successfully — open the Opportunity stage to retry just the analysis.
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          }}
        >
          <StatCard
            label="Apps found"
            value={stats.appsFound}
            caption={`${stats.competitorsAnalysed} analysed in depth`}
          />
          <StatCard
            label="Average rating"
            value={rating(stats.averageRating)}
            caption={`Median ${rating(stats.medianRating)}`}
            delta={{
              label:
                stats.averageRating >= 4.4
                  ? 'Incumbents are well liked — hard market'
                  : stats.averageRating >= 4.0
                    ? 'Solid but not untouchable'
                    : 'Users are unhappy — room to win',
              tone: stats.averageRating >= 4.4 ? 'critical' : stats.averageRating >= 4.0 ? 'neutral' : 'good',
            }}
          />
          <StatCard
            label="Combined installs"
            value={compactNumber(stats.totalMinInstalls)}
            caption={`Across ${stats.distinctDevelopers} distinct developers`}
          />
          <StatCard
            label="Reviews analysed"
            value={compactNumber(stats.reviewsAnalysed)}
            caption="Newest first, spam removed"
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: '1.35fr 1fr' },
            alignItems: 'stretch',
          }}
        >
          <SectionCard title="Where the competition sits">
            {competitors.length > 0 ? (
              <MarketLandscapeChart competitors={competitors} height={310} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Not enough install data to plot the landscape.
              </Typography>
            )}
          </SectionCard>

          <SectionCard title="How the market is monetised">
            <Stack spacing={2.5}>
              <ShareRow label="Free to install" value={stats.freeShare} />
              <ShareRow label="Offer in-app purchases" value={stats.iapShare} />
              <ShareRow label="Ad supported" value={stats.adShare} />
              <ShareRow label="Updated in the last 6 months" value={stats.activelyMaintainedShare} />

              <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5, lineHeight: 1.6 }}>
                {stats.iapShare >= 50
                  ? 'Most incumbents already charge, which means users in this category are used to paying.'
                  : stats.adShare >= 60
                    ? 'This field leans on advertising, which is usually where the complaints come from.'
                    : 'Monetisation here is inconsistent — worth checking what the leaders actually charge for.'}
              </Typography>
            </Stack>
          </SectionCard>
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1.35fr' } }}>
          <SectionCard title="Combined rating distribution">
            <RatingDistributionChart
              histogram={stats.histogram}
              title=""
              subtitle={`All ${stats.competitorsAnalysed} analysed competitors`}
              height={250}
            />
          </SectionCard>

          <SectionCard
            title="Biggest players"
            subtitle="Ranked by install base"
            action={
              <Button
                component={NextLink}
                href={`/research/${record.id}/competitors`}
                size="small"
                endIcon={<ArrowForwardRoundedIcon />}
              >
                All competitors
              </Button>
            }
          >
            <Box
              sx={{
                display: 'grid',
                gap: 1.75,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              {topByInstalls.map((competitor) => (
                <CompetitorCard key={competitor.appId} competitor={competitor} />
              ))}
            </Box>
          </SectionCard>
        </Box>
      </Stack>

      <NextStepCard record={record} />
    </Box>
  );
}

/** A labelled share meter. Not a chart - one number, so it gets a bar and a value. */
function ShareRow({ label, value }: { label: string; value: number }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.625 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {percent(value, 0)}
        </Typography>
      </Stack>
      <Box
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        sx={(theme) => ({
          height: 7,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(15,17,21,0.07)',
        })}
      >
        <Box
          sx={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, value))}%`,
            borderRadius: 999,
            backgroundColor: 'primary.main',
            transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </Box>
    </Box>
  );
}
