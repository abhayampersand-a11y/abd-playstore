'use client';

import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import ReviewsRoundedIcon from '@mui/icons-material/ReviewsRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import SentimentSatisfiedAltRoundedIcon from '@mui/icons-material/SentimentSatisfiedAltRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { CompetitorComparisonChart } from '@/components/charts/CompetitorComparisonChart';
import { RatingDistributionChart } from '@/components/charts/RatingDistributionChart';
import { SentimentChart } from '@/components/charts/SentimentChart';
import { ThemeBarChart } from '@/components/charts/ThemeBarChart';
import { SectionCard } from '@/components/common/SectionCard';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/States';
import { compactNumber, percent } from '@/lib/format';
import type { ThemeBucket } from '@/lib/types';
import { useResearchWorkspace } from './ResearchWorkspaceProvider';
import { NextStepCard } from './NextStepCard';
import { QuoteList } from './QuoteList';

/**
 * Stage 3 - what users actually say.
 *
 * This is the evidence layer. Everything on this page is computed locally from
 * real reviews, so it is verifiable: a developer can read the quotes behind any
 * percentage rather than taking a model's word for it.
 */
export function ReviewIntelligenceStage() {
  const { record } = useResearchWorkspace();
  const [tab, setTab] = useState(0);

  if (!record) return null;
  const insights = record.reviewInsights;

  if (insights.reviewsAnalysed === 0) {
    return (
      <Box>
        <SectionCard title="Review Intelligence">
          <EmptyState
            icon={<ReviewsRoundedIcon />}
            title="No reviews were available"
            description="Google Play returned no usable written reviews for these apps in this language. Try re-running the research in English, or in a larger market where review volume is higher."
          />
        </SectionCard>
        <NextStepCard record={record} />
      </Box>
    );
  }

  const negativeShare =
    insights.reviewsAnalysed > 0 ? (insights.negativeReviews / insights.reviewsAnalysed) * 100 : 0;
  const topComplaint = insights.complaints[0];
  const topRequest = insights.featureRequests[0];

  return (
    <Box>
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          }}
        >
          <StatCard
            label="Reviews analysed"
            value={compactNumber(insights.reviewsAnalysed)}
            caption={`Across ${insights.perApp.length} apps`}
            icon={<ReviewsRoundedIcon />}
          />
          <StatCard
            label="Negative share"
            value={percent(negativeShare)}
            caption={`${compactNumber(insights.negativeReviews)} reviews at 1-2★`}
            icon={<SentimentDissatisfiedRoundedIcon />}
            delta={{
              label:
                negativeShare >= 30
                  ? 'High dissatisfaction — real opening'
                  : negativeShare >= 15
                    ? 'Normal for the category'
                    : 'Users are broadly happy',
              tone: negativeShare >= 30 ? 'good' : negativeShare >= 15 ? 'neutral' : 'critical',
            }}
          />
          <StatCard
            label="Top complaint"
            value={topComplaint ? percent(topComplaint.percentage) : '—'}
            caption={topComplaint?.label ?? 'No dominant complaint'}
            icon={<SentimentDissatisfiedRoundedIcon />}
          />
          <StatCard
            label="Most-requested feature"
            value={topRequest ? percent(topRequest.percentage) : '—'}
            caption={topRequest?.label ?? 'No repeated requests'}
            icon={<LightbulbRoundedIcon />}
          />
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard title="Sentiment split">
            <SentimentChart sentiment={insights.sentiment} title="" height={230} />
          </SectionCard>
          <SectionCard title="Sampled rating distribution">
            <RatingDistributionChart
              histogram={insights.histogram}
              title=""
              subtitle="From the reviews we read, not the lifetime histogram"
              height={230}
            />
          </SectionCard>
        </Box>

        <SectionCard title="Themes" subtitle="Every percentage is a share of the reviews it was measured against" disablePadding>
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
            <Tabs value={tab} onChange={(_, next: number) => setTab(next)} variant="scrollable" scrollButtons="auto">
              <Tab
                icon={<SentimentDissatisfiedRoundedIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label={`Complaints (${insights.complaints.length})`}
              />
              <Tab
                icon={<SentimentSatisfiedAltRoundedIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label={`Positive feedback (${insights.praise.length})`}
              />
              <Tab
                icon={<LightbulbRoundedIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label={`Feature requests (${insights.featureRequests.length})`}
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 2.5 }}>
            {tab === 0 ? (
              <ThemePanel
                buckets={insights.complaints}
                tone="complaint"
                chartTitle="What users complain about"
                chartSubtitle="Share of 1-2★ reviews mentioning each theme"
                quotes={insights.quotes.negative}
                quoteTone="negative"
                quoteTitle="In their own words"
                emptyTitle="No recurring complaints"
                emptyDescription="The negative reviews we read did not cluster into a repeated theme."
              />
            ) : tab === 1 ? (
              <ThemePanel
                buckets={insights.praise}
                tone="praise"
                chartTitle="What users love"
                chartSubtitle="Share of 4-5★ reviews mentioning each theme"
                quotes={insights.quotes.positive}
                quoteTone="positive"
                quoteTitle="What keeps them"
                emptyTitle="No recurring praise"
                emptyDescription="Positive reviews here are mostly generic, which itself suggests weak loyalty."
              />
            ) : (
              <ThemePanel
                buckets={insights.featureRequests}
                tone="request"
                chartTitle="What users keep asking for"
                chartSubtitle="Share of request-shaped reviews mentioning each theme"
                quotes={insights.quotes.featureRequests}
                quoteTone="request"
                quoteTitle="The actual requests"
                emptyTitle="No repeated feature requests"
                emptyDescription="Users are not asking for anything specific — which can mean the category is well served."
              />
            )}
          </Box>
        </SectionCard>

        {insights.perApp.length > 1 ? (
          <SectionCard title="Which competitors are struggling">
            <CompetitorComparisonChart perApp={insights.perApp} />
          </SectionCard>
        ) : null}

        <SectionCard title="Biggest user pain points" icon={<SentimentDissatisfiedRoundedIcon sx={{ fontSize: 19 }} />}>
          {insights.complaints.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No dominant pain points emerged from the reviews we read.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {insights.complaints.slice(0, 4).map((complaint, index) => (
                <PainPoint key={complaint.id} complaint={complaint} rank={index + 1} />
              ))}
            </Stack>
          )}
        </SectionCard>
      </Stack>

      <NextStepCard record={record} />
    </Box>
  );
}

function ThemePanel({
  buckets,
  tone,
  chartTitle,
  chartSubtitle,
  quotes,
  quoteTone,
  quoteTitle,
  emptyTitle,
  emptyDescription,
}: {
  buckets: ThemeBucket[];
  tone: 'complaint' | 'praise' | 'request';
  chartTitle: string;
  chartSubtitle: string;
  quotes: Parameters<typeof QuoteList>[0]['quotes'];
  quoteTone: 'negative' | 'positive' | 'request';
  quoteTitle: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (buckets.length === 0) {
    return <EmptyState icon={<ReviewsRoundedIcon />} title={emptyTitle} description={emptyDescription} compact />;
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.25fr 1fr' } }}>
      <ThemeBarChart buckets={buckets} title={chartTitle} subtitle={chartSubtitle} tone={tone} />
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 650, mb: 1.5 }}>
          {quoteTitle}
        </Typography>
        <QuoteList quotes={quotes} tone={quoteTone} max={5} />
      </Box>
    </Box>
  );
}

function PainPoint({ complaint, rank }: { complaint: ThemeBucket; rank: number }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 28,
          height: 28,
          borderRadius: '9px',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          fontWeight: 700,
          fontSize: '0.8125rem',
          color: theme.palette.error.main,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(208,59,59,0.18)' : 'rgba(208,59,59,0.1)',
        })}
      >
        {rank}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            {complaint.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {percent(complaint.percentage, 1)} · {complaint.count} reviews
          </Typography>
        </Stack>
        {complaint.examples[0] ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic', lineHeight: 1.6 }}>
            “{complaint.examples[0]}”
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
