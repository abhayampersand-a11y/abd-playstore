'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { useMemo } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { RecommendationBadge, ScoreBar } from '@/components/common/Scores';
import { StatCard } from '@/components/common/StatCard';
import { CardSkeleton, EmptyState } from '@/components/common/States';
import { score } from '@/lib/format';
import { SCORE_DESCRIPTORS, bandOf } from '@/lib/research/scoring';
import { useAllRecords } from '@/lib/store/useAllRecords';
import { labelForCountry } from '@/lib/validation';
import type { ResearchRecord } from '@/lib/types';

/**
 * Every analysed market, ranked by opportunity score.
 *
 * This is the page that answers the product's core question directly: across
 * everything researched so far, which idea is actually worth building?
 */
export function OpportunitiesView() {
  const { records, loading } = useAllRecords();

  const analysed = useMemo(
    () =>
      records
        .filter((record) => record.analysis)
        .sort((a, b) => (b.analysis?.opportunityScore ?? 0) - (a.analysis?.opportunityScore ?? 0)),
    [records],
  );

  const summary = useMemo(() => {
    const scores = analysed.map((record) => record.analysis!.opportunityScore);
    return {
      total: analysed.length,
      strong: analysed.filter((record) => record.analysis!.recommendation === 'STRONG').length,
      best: scores.length > 0 ? Math.max(...scores) : 0,
      average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };
  }, [analysed]);

  return (
    <Box>
      <PageHeader
        title="AI Opportunities"
        description="Every market the AI has scored for you, ranked best-first."
        crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'AI Opportunities' }]}
        action={
          <Button component={NextLink} href="/research/new" variant="contained" startIcon={<AddRoundedIcon />}>
            Research New Idea
          </Button>
        }
      />

      {loading ? (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
          <CardSkeleton height={200} />
          <CardSkeleton height={200} />
        </Box>
      ) : analysed.length === 0 ? (
        <SectionCard title="Opportunities">
          <EmptyState
            icon={<AutoAwesomeRoundedIcon />}
            title="No scored opportunities yet"
            description="Run a research and let the AI analyse it. Every scored market lands here, ranked, so you can compare ideas against each other rather than one at a time."
            action={
              <Button component={NextLink} href="/research/new" variant="contained" startIcon={<AddRoundedIcon />}>
                Research New Idea
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            }}
          >
            <StatCard label="Markets scored" value={summary.total} caption="Scored by AI" />
            <StatCard
              label="Strong opportunities"
              value={summary.strong}
              caption="Scoring 7.0 or above"
              delta={{
                label: summary.strong > 0 ? 'Worth building' : 'Keep looking',
                tone: summary.strong > 0 ? 'good' : 'neutral',
              }}
            />
            <StatCard label="Best score" value={score(summary.best)} caption="Highest so far" />
            <StatCard label="Average score" value={score(summary.average)} caption="Across all analyses" />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
            }}
          >
            {analysed.map((record, index) => (
              <OpportunityCard key={record.id} record={record} rank={index + 1} />
            ))}
          </Box>
        </Stack>
      )}
    </Box>
  );
}

function OpportunityCard({ record, rank }: { record: ResearchRecord; rank: number }) {
  const analysis = record.analysis!;
  const band = bandOf(analysis.recommendation);

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea
        component={NextLink}
        href={`/research/${record.id}/opportunity`}
        sx={{ height: '100%', alignItems: 'stretch', p: 2.5 }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <Box
                aria-hidden
                sx={(theme) => {
                  const tone =
                    band.tone === 'good'
                      ? theme.palette.success.main
                      : band.tone === 'warning'
                        ? theme.palette.warning.main
                        : theme.palette.error.main;
                  return {
                    width: 30,
                    height: 30,
                    borderRadius: '10px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                    color: tone,
                    backgroundColor: alpha(tone, theme.palette.mode === 'dark' ? 0.18 : 0.1),
                  };
                }}
              >
                {rank}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" component="p" noWrap>
                  {analysis.recommendedApp.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {analysis.recommendedApp.tagline}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography
                component="p"
                sx={{ fontSize: '1.625rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}
              >
                {score(analysis.opportunityScore)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                out of 10
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
            <RecommendationBadge recommendation={analysis.recommendation} size="small" />
            <Chip label={record.input.keyword} size="small" variant="outlined" />
            <Chip label={labelForCountry(record.input.country)} size="small" variant="outlined" />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.65 }}>
            {analysis.recommendationHeadline}
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 'auto' }}>
            {SCORE_DESCRIPTORS.slice(0, 3).map((descriptor) => (
              <ScoreBar key={descriptor.key} label={descriptor.label} value={analysis[descriptor.key]} />
            ))}
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 2.5, color: 'primary.main' }}>
            <Typography variant="body2" sx={{ fontWeight: 650 }}>
              Open analysis
            </Typography>
            <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
          </Stack>
        </Box>
      </CardActionArea>
    </Card>
  );
}
