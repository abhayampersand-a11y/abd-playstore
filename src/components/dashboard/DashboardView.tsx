'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useMemo } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { RecommendationBadge } from '@/components/common/Scores';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState, StatRowSkeleton, TableSkeleton } from '@/components/common/States';
import { score } from '@/lib/format';
import { useResearchStore } from '@/lib/store/ResearchStore';
import { ResearchList } from './ResearchList';

export function DashboardView() {
  const { items, stats, ready, storageAvailable } = useResearchStore();

  const recent = useMemo(() => items.slice(0, 6), [items]);
  const topOpportunity = useMemo(
    () =>
      items
        .filter((item) => typeof item.opportunityScore === 'number')
        .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))[0],
    [items],
  );

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description="Which app should you build next? Every research you run adds evidence to that answer."
        action={
          <Button
            component={NextLink}
            href="/research/new"
            variant="contained"
            size="large"
            startIcon={<AddRoundedIcon />}
          >
            Research New Idea
          </Button>
        }
      />

      {!storageAvailable ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your browser is blocking local storage, so research cannot be saved between visits. You can still run
          research, but leaving the page will lose it.
        </Alert>
      ) : null}

      {!ready ? (
        <Stack spacing={3}>
          <StatRowSkeleton count={4} />
          <SectionCard title="Recent searches" disablePadding>
            <TableSkeleton rows={5} />
          </SectionCard>
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            }}
          >
            <StatCard
              label="Total researches"
              value={stats.totalResearches}
              caption={stats.totalResearches === 0 ? 'Run your first one' : 'Markets you have investigated'}
              icon={<ScienceRoundedIcon />}
            />
            <StatCard
              label="Saved opportunities"
              value={stats.savedOpportunities}
              caption="Bookmarked for later"
              icon={<BookmarkRoundedIcon />}
            />
            <StatCard
              label="High opportunity ideas"
              value={stats.highOpportunityIdeas}
              caption="Scoring 7.0 or above"
              icon={<TrendingUpRoundedIcon />}
              delta={
                stats.analysedCount > 0
                  ? {
                      label: `${stats.highOpportunityIdeas} of ${stats.analysedCount} analysed`,
                      tone: stats.highOpportunityIdeas > 0 ? 'good' : 'neutral',
                    }
                  : undefined
              }
            />
            <StatCard
              label="Average opportunity score"
              value={stats.analysedCount > 0 ? score(stats.averageOpportunityScore) : '—'}
              caption={stats.analysedCount > 0 ? 'Across analysed markets' : 'No analyses yet'}
              icon={<InsightsRoundedIcon />}
            />
          </Box>

          {topOpportunity && topOpportunity.recommendation ? (
            <SectionCard
              title="Your strongest opportunity so far"
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 19 }} />}
              action={
                <Button component={NextLink} href={`/research/${topOpportunity.id}/opportunity`} size="small">
                  Open analysis
                </Button>
              }
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2.5}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" component="p" sx={{ mb: 0.375 }}>
                    {topOpportunity.appName ?? topOpportunity.keyword}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    From your research on “{topOpportunity.keyword}” in {topOpportunity.country.toUpperCase()}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      component="p"
                      sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}
                    >
                      {score(topOpportunity.opportunityScore)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      out of 10
                    </Typography>
                  </Box>
                  <RecommendationBadge recommendation={topOpportunity.recommendation} />
                </Stack>
              </Stack>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Recent searches"
            subtitle={items.length > 0 ? `${items.length} in total` : undefined}
            action={
              items.length > 6 ? (
                <Button component={NextLink} href="/history" size="small">
                  View all
                </Button>
              ) : undefined
            }
            disablePadding
          >
            {recent.length === 0 ? (
              <EmptyState
                icon={<TravelExploreRoundedIcon />}
                title="No research yet"
                description="Enter an app idea — Expense Manager, Habit Tracker, Invoice Generator — and AppScout will map the competition, mine the reviews and score the opportunity."
                action={
                  <Button component={NextLink} href="/research/new" variant="contained" startIcon={<AddRoundedIcon />}>
                    Research New Idea
                  </Button>
                }
              />
            ) : (
              <ResearchList items={recent} />
            )}
          </SectionCard>
        </Stack>
      )}
    </Box>
  );
}
