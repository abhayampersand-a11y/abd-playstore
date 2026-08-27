'use client';

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { useCallback, useState } from 'react';

import { ScoreRadarChart } from '@/components/charts/ScoreRadarChart';
import { SectionCard } from '@/components/common/SectionCard';
import { RecommendationBadge, ScoreBar, ScoreDial } from '@/components/common/Scores';
import { ErrorState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { runAnalysis } from '@/lib/api-client';
import { toAppError, type AppError } from '@/lib/errors';
import { percent } from '@/lib/format';
import { SCORE_DESCRIPTORS, bandOf } from '@/lib/research/scoring';
import type { MissingFeature, MonetizationIdea, TargetUser } from '@/lib/types';
import { GenerateGate } from './GenerateGate';
import { useResearchWorkspace } from './ResearchWorkspaceProvider';

/**
 * Stage 4 - the verdict.
 *
 * The headline is the score plus the traffic light; everything below it is the
 * reasoning that produced them. A developer should be able to disagree with the
 * verdict and see exactly which claim they disagree with.
 */
export function OpportunityStage() {
  const { record, update } = useResearchWorkspace();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const generate = useCallback(async () => {
    if (!record) return;
    setLoading(true);
    setError(null);
    try {
      const { analysis, usage } = await runAnalysis({
        input: record.input,
        competitors: record.competitors,
        marketStats: record.marketStats,
        reviewInsights: record.reviewInsights,
      });
      await update({
        analysis,
        stage: 'opportunity',
        status: 'complete',
        error: undefined,
        usage: {
          inputTokens: record.usage.inputTokens + usage.inputTokens,
          outputTokens: record.usage.outputTokens + usage.outputTokens,
          calls: record.usage.calls + usage.calls,
        },
      });
      toast.success('Opportunity analysis ready');
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError);
      toast.error(appError.message, 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [record, update, toast]);

  if (!record) return null;
  const analysis = record.analysis;

  if (!analysis) {
    return (
      <GenerateGate
        title="Run the AI opportunity analysis"
        description="The AI reads the cleaned competitor and review evidence from this research and decides whether there is a real opportunity here."
        bullets={[
          'Six scores from 0-10, all pointing the same way — higher is better for you',
          'A GREEN / YELLOW / RED verdict you can act on',
          'The missing features, user pain and differentiation angles behind that verdict',
          'A concrete recommended app concept to build',
        ]}
        buttonLabel="Analyse this market"
        runningLabel="Analysing…"
        loading={loading}
        error={error}
        onGenerate={() => void generate()}
      />
    );
  }

  const band = bandOf(analysis.recommendation);

  return (
    <Box>
      <Stack spacing={3}>
        {error ? <ErrorState error={error} onRetry={() => void generate()} /> : null}

        {/* Verdict ------------------------------------------------------- */}
        <Card
          sx={(theme) => {
            const tone =
              band.tone === 'good'
                ? theme.palette.success.main
                : band.tone === 'warning'
                  ? theme.palette.warning.main
                  : theme.palette.error.main;
            return {
              p: { xs: 2.5, sm: 3.5 },
              borderColor: alpha(tone, 0.32),
              backgroundColor: alpha(tone, theme.palette.mode === 'dark' ? 0.08 : 0.04),
            };
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 4 }} alignItems="center">
            <ScoreDial value={analysis.opportunityScore} recommendation={analysis.recommendation} />

            <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', md: 'left' } }}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mb: 1.5, justifyContent: { xs: 'center', md: 'flex-start' } }}
              >
                <RecommendationBadge recommendation={analysis.recommendation} size="large" />
              </Stack>

              <Typography variant="h3" component="p" sx={{ mb: 1 }}>
                {analysis.recommendationHeadline}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {analysis.recommendationReason}
              </Typography>

              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mt: 2.5, justifyContent: { xs: 'center', md: 'flex-start' }, flexWrap: 'wrap', rowGap: 1.5 }}
              >
                <Button
                  component={NextLink}
                  href={`/research/${record.id}/build-plan`}
                  variant="contained"
                  size="large"
                  startIcon={<RocketLaunchRoundedIcon />}
                >
                  Build This App
                </Button>
                <Button
                  onClick={() => void generate()}
                  variant="outlined"
                  disabled={loading}
                  startIcon={<RefreshRoundedIcon />}
                >
                  {loading ? 'Re-analysing…' : 'Re-analyse'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Card>

        {/* Scores -------------------------------------------------------- */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard title="Market scores" subtitle="Higher is always better for you">
            <Stack spacing={2.5}>
              {SCORE_DESCRIPTORS.map((descriptor) => (
                <ScoreBar
                  key={descriptor.key}
                  label={descriptor.label}
                  value={analysis[descriptor.key]}
                  description={descriptor.description}
                  highMeans={descriptor.highMeans}
                />
              ))}
              <Divider />
              <ScoreBar label="Overall opportunity" value={analysis.opportunityScore} emphasis />
            </Stack>
          </SectionCard>

          <SectionCard title="Opportunity profile">
            <ScoreRadarChart scores={analysis} height={320} />
          </SectionCard>
        </Box>

        {/* Market summary ------------------------------------------------ */}
        <SectionCard title="Market summary" icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 19 }} />}>
          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
            {analysis.marketSummary}
          </Typography>
        </SectionCard>

        {/* Recommended concept ------------------------------------------- */}
        <SectionCard title="Recommended app concept" icon={<LightbulbRoundedIcon sx={{ fontSize: 19 }} />}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h3" component="p">
                {analysis.recommendedApp.name}
              </Typography>
              <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 600, mt: 0.25 }}>
                {analysis.recommendedApp.tagline}
              </Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
              {analysis.recommendedApp.oneLiner}
            </Typography>

            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Primary differentiator
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                {analysis.recommendedApp.primaryDifferentiator}
              </Typography>
            </Box>

            <Chip label={analysis.recommendedApp.category} size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
          </Stack>
        </SectionCard>

        {/* Why + problems ------------------------------------------------ */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard title="Why this opportunity exists">
            <BulletList items={analysis.whyOpportunityExists} tone="good" />
          </SectionCard>
          <SectionCard title="Existing market problems">
            <BulletList items={analysis.existingMarketProblems} tone="critical" />
          </SectionCard>
        </Box>

        {/* Target users -------------------------------------------------- */}
        <SectionCard title="Target users" icon={<GroupsRoundedIcon sx={{ fontSize: 19 }} />}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {analysis.targetUsers.map((user) => (
              <TargetUserCard key={user.segment} user={user} />
            ))}
          </Box>
        </SectionCard>

        {/* Complaints ---------------------------------------------------- */}
        <SectionCard
          title="Common complaints"
          subtitle="The model's reading of the complaint evidence from stage 3"
          icon={<ReportProblemRoundedIcon sx={{ fontSize: 19 }} />}
        >
          <Stack spacing={2.25}>
            {analysis.commonComplaints.map((complaint) => (
              <Box key={complaint.complaint}>
                <Stack direction="row" spacing={1.25} alignItems="baseline" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {complaint.complaint}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {percent(complaint.percentage)}
                  </Typography>
                  <SeverityChip level={complaint.severity} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  {complaint.evidence}
                </Typography>
              </Box>
            ))}
          </Stack>
        </SectionCard>

        {/* Missing features ---------------------------------------------- */}
        <SectionCard
          title="Missing features"
          subtitle="Requested repeatedly, shipped by nobody"
          icon={<BuildRoundedIcon sx={{ fontSize: 19 }} />}
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            }}
          >
            {analysis.missingFeatures.map((feature) => (
              <MissingFeatureCard key={feature.feature} feature={feature} />
            ))}
          </Box>
        </SectionCard>

        {/* Differentiation + monetisation -------------------------------- */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard title="Differentiation strategy">
            <BulletList items={analysis.differentiationStrategy} tone="primary" />
          </SectionCard>

          <SectionCard title="Monetization strategy" icon={<PaymentsRoundedIcon sx={{ fontSize: 19 }} />}>
            <Stack spacing={2.25}>
              {analysis.monetizationIdeas.map((idea) => (
                <MonetizationRow key={idea.model} idea={idea} />
              ))}
            </Stack>
          </SectionCard>
        </Box>

        {/* Risks --------------------------------------------------------- */}
        <SectionCard title="Risks to weigh" icon={<ReportProblemRoundedIcon sx={{ fontSize: 19 }} />}>
          <BulletList items={analysis.risks} tone="warning" />
        </SectionCard>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function BulletList({
  items,
  tone = 'primary',
}: {
  items: string[];
  tone?: 'primary' | 'good' | 'critical' | 'warning';
}) {
  return (
    <Stack component="ul" spacing={1.25} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((item) => (
        <Stack component="li" key={item} direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            aria-hidden
            sx={(theme) => ({
              width: 6,
              height: 6,
              borderRadius: '50%',
              mt: '9px',
              flexShrink: 0,
              backgroundColor:
                tone === 'good'
                  ? theme.palette.success.main
                  : tone === 'critical'
                    ? theme.palette.error.main
                    : tone === 'warning'
                      ? theme.palette.warning.main
                      : theme.palette.primary.main,
            })}
          />
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function SeverityChip({ level }: { level: 'high' | 'medium' | 'low' }) {
  return (
    <Chip
      label={`${level} severity`}
      size="small"
      variant="outlined"
      color={level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'default'}
      sx={{ height: 19, fontSize: '0.6875rem' }}
    />
  );
}

function TargetUserCard({ user }: { user: TargetUser }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'surface.subtle',
        height: '100%',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {user.segment}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {percent(user.share)}
        </Typography>
      </Stack>
      <Box
        role="meter"
        aria-valuenow={user.share}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${user.segment} share`}
        sx={(theme) => ({
          height: 5,
          borderRadius: 999,
          mb: 1.25,
          overflow: 'hidden',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,17,21,0.07)',
        })}
      >
        <Box sx={{ height: '100%', width: `${Math.min(100, user.share)}%`, backgroundColor: 'primary.main' }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {user.description}
      </Typography>
    </Box>
  );
}

function MissingFeatureCard({ feature }: { feature: MissingFeature }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'surface.subtle',
        height: '100%',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 650, mb: 0.75 }}>
        {feature.feature}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ mb: 1.25 }}>
        <Chip
          label={`${feature.demandLevel} demand`}
          size="small"
          variant="outlined"
          color={feature.demandLevel === 'high' ? 'success' : 'default'}
          sx={{ height: 19, fontSize: '0.6875rem' }}
        />
        <Chip
          label={`${feature.buildEffort} effort`}
          size="small"
          variant="outlined"
          color={feature.buildEffort === 'low' ? 'success' : feature.buildEffort === 'high' ? 'warning' : 'default'}
          sx={{ height: 19, fontSize: '0.6875rem' }}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
        {feature.rationale}
      </Typography>
    </Box>
  );
}

function MonetizationRow({ idea }: { idea: MonetizationIdea }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {idea.model}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {idea.potential.toFixed(1)}/10 potential
        </Typography>
      </Stack>
      <Box
        role="meter"
        aria-valuenow={idea.potential}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${idea.model} revenue potential`}
        sx={(theme) => ({
          height: 5,
          borderRadius: 999,
          mb: 1,
          overflow: 'hidden',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,17,21,0.07)',
        })}
      >
        <Box
          sx={{ height: '100%', width: `${(idea.potential / 10) * 100}%`, backgroundColor: 'success.main' }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
        {idea.description}
      </Typography>
    </Box>
  );
}
