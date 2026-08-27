'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { RatingDistributionChart } from '@/components/charts/RatingDistributionChart';
import { SentimentChart } from '@/components/charts/SentimentChart';
import { ThemeBarChart } from '@/components/charts/ThemeBarChart';
import { SectionCard } from '@/components/common/SectionCard';
import { EmptyState, ErrorState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { QuoteList } from '@/components/research/QuoteList';
import { useResearchWorkspace } from '@/components/research/ResearchWorkspaceProvider';
import { fetchCompetitorDetail, fetchNegativeReviews } from '@/lib/api-client';
import { toAppError, type AppError } from '@/lib/errors';
import { compactNumber, formatDate, rating } from '@/lib/format';
import type { Competitor, NegativeReviewsResponse } from '@/lib/types';
import { AppIcon } from './AppIcon';
import { NegativeReviewList } from './NegativeReviewList';

/**
 * One competitor, in full.
 *
 * Review stats are only collected for the apps the pipeline judged most
 * informative, so an app without them offers an on-demand deep dive rather
 * than an empty page.
 */
export function CompetitorDetail({ appId }: { appId: string }) {
  const { record, researchId, update } = useResearchWorkspace();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // The full negative sweep is expensive, so it is fetched on request and held
  // in component state rather than written into the record - it is reading
  // material, not part of the analysed dataset.
  const [negatives, setNegatives] = useState<NegativeReviewsResponse | null>(null);
  const [negativesLoading, setNegativesLoading] = useState(false);
  const [negativesError, setNegativesError] = useState<AppError | null>(null);

  const competitor = useMemo(
    () => record?.competitors.find((entry) => entry.appId === appId),
    [record, appId],
  );

  const loadNegatives = useCallback(async () => {
    if (!record || !competitor) return;
    setNegativesLoading(true);
    setNegativesError(null);
    try {
      setNegatives(
        await fetchNegativeReviews({
          appId: competitor.appId,
          country: record.input.country,
          language: record.input.language,
        }),
      );
    } catch (caught) {
      setNegativesError(toAppError(caught));
    } finally {
      setNegativesLoading(false);
    }
  }, [record, competitor]);

  const deepDive = useCallback(async () => {
    if (!record || !competitor) return;
    setLoading(true);
    setError(null);
    try {
      const { competitor: fresh, reviewsAnalysed } = await fetchCompetitorDetail({
        appId: competitor.appId,
        country: record.input.country,
        language: record.input.language,
        reviewCount: 120,
      });

      const merged: Competitor = { ...competitor, ...fresh, rank: competitor.rank };
      await update({
        competitors: record.competitors.map((entry) => (entry.appId === appId ? merged : entry)),
      });

      toast.success(
        reviewsAnalysed > 0
          ? `Analysed ${reviewsAnalysed} reviews for ${competitor.title}`
          : `No written reviews available for ${competitor.title}`,
      );
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError);
      toast.error(appError.message, 'Deep dive failed');
    } finally {
      setLoading(false);
    }
  }, [record, competitor, appId, update, toast]);

  if (!record) return null;

  if (!competitor) {
    return (
      <Card>
        <EmptyState
          icon={<SearchOffRoundedIcon />}
          title="That app is not part of this research"
          description="It may have been removed when the research was re-run."
          action={
            <Button
              component={NextLink}
              href={`/research/${researchId}/competitors`}
              variant="contained"
              startIcon={<ArrowBackRoundedIcon />}
            >
              Back to competitors
            </Button>
          }
        />
      </Card>
    );
  }

  const stats = competitor.reviewStats;

  return (
    <Box>
      <Button
        component={NextLink}
        href={`/research/${researchId}/competitors`}
        startIcon={<ArrowBackRoundedIcon />}
        size="small"
        sx={{ mb: 2, ml: -1 }}
      >
        All competitors
      </Button>

      <Stack spacing={3}>
        {error ? <ErrorState error={error} onRetry={() => void deepDive()} /> : null}

        {/* Header -------------------------------------------------------- */}
        <Card sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'flex-start' }}>
            <AppIcon src={competitor.icon} title={competitor.title} size={76} />

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h2" component="h2" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                {competitor.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {competitor.developer}
              </Typography>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.75, rowGap: 0.75 }}>
                {competitor.genre ? <Chip label={competitor.genre} size="small" variant="outlined" /> : null}
                <Chip
                  label={competitor.free ? 'Free' : (competitor.priceText ?? 'Paid')}
                  size="small"
                  variant="outlined"
                />
                {competitor.offersIAP ? (
                  <Chip
                    label={competitor.iapRange ? `IAP ${competitor.iapRange}` : 'In-app purchases'}
                    size="small"
                    variant="outlined"
                  />
                ) : null}
                {competitor.adSupported ? (
                  <Chip
                    icon={<CampaignRoundedIcon sx={{ fontSize: 13 }} />}
                    label="Contains ads"
                    size="small"
                    variant="outlined"
                  />
                ) : null}
                {competitor.contentRating ? (
                  <Chip label={competitor.contentRating} size="small" variant="outlined" />
                ) : null}
              </Stack>
            </Box>

            <Stack spacing={1} sx={{ flexShrink: 0 }}>
              {competitor.url ? (
                <Button
                  href={competitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  endIcon={<LaunchRoundedIcon sx={{ fontSize: 15 }} />}
                >
                  View on Play
                </Button>
              ) : null}
              <Button
                onClick={() => void deepDive()}
                variant={stats ? 'outlined' : 'contained'}
                size="small"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshRoundedIcon />}
              >
                {loading ? 'Analysing…' : stats ? 'Refresh reviews' : 'Analyse reviews'}
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
            }}
          >
            <MetaStat
              label="Rating"
              value={
                <Stack direction="row" spacing={0.375} alignItems="center">
                  <StarRoundedIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                  <span>{rating(competitor.score)}</span>
                </Stack>
              }
            />
            <MetaStat label="Ratings" value={compactNumber(competitor.ratingCount)} />
            <MetaStat label="Reviews" value={compactNumber(competitor.reviewCount)} />
            <MetaStat label="Installs" value={competitor.installs ?? compactNumber(competitor.minInstalls)} />
            <MetaStat label="Updated" value={formatDate(competitor.updated)} />
          </Box>
        </Card>

        {/* Screenshots --------------------------------------------------- */}
        {competitor.screenshots.length > 0 ? (
          <SectionCard title="Screenshots" subtitle="Click to enlarge">
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                overflowX: 'auto',
                pb: 1,
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 999 },
              }}
            >
              {competitor.screenshots.map((screenshot) => (
                <Box
                  key={screenshot}
                  component="img"
                  src={screenshot}
                  alt={`${competitor.title} screenshot`}
                  loading="lazy"
                  onClick={() => setLightbox(screenshot)}
                  sx={{
                    height: 300,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'surface.sunken',
                    cursor: 'zoom-in',
                    flexShrink: 0,
                  }}
                />
              ))}
            </Stack>
          </SectionCard>
        ) : null}

        {/* Description --------------------------------------------------- */}
        {competitor.description ? (
          <SectionCard title="Description">
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              {competitor.description}
            </Typography>
          </SectionCard>
        ) : null}

        {/* Review analysis ----------------------------------------------- */}
        {stats ? (
          <>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
              <SectionCard title="Rating distribution" subtitle={`${stats.analysed} reviews sampled`}>
                <RatingDistributionChart histogram={stats.histogram} title="" subtitle="" height={230} />
              </SectionCard>
              <SectionCard title="Review sentiment">
                <SentimentChart sentiment={stats.sentiment} title="" height={230} />
              </SectionCard>
            </Box>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
              <SectionCard title="Feature complaints">
                {stats.complaints.length > 0 ? (
                  <ThemeBarChart
                    buckets={stats.complaints}
                    title=""
                    subtitle="Share of this app's negative reviews"
                    tone="complaint"
                    max={6}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recurring complaints in the reviews we read.
                  </Typography>
                )}
              </SectionCard>

              <SectionCard title="What users praise">
                {stats.praise.length > 0 ? (
                  <ThemeBarChart
                    buckets={stats.praise}
                    title=""
                    subtitle="Share of this app's positive reviews"
                    tone="praise"
                    max={6}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recurring praise themes in the reviews we read.
                  </Typography>
                )}
              </SectionCard>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
              }}
            >
              <SectionCard title="Negative feedback">
                <QuoteList quotes={stats.topNegative} tone="negative" max={4} />
              </SectionCard>
              <SectionCard title="Positive feedback">
                <QuoteList quotes={stats.topPositive} tone="positive" max={4} />
              </SectionCard>
              <SectionCard title="Feature requests">
                <QuoteList
                  quotes={stats.featureRequests}
                  tone="request"
                  max={4}
                  emptyMessage="Nobody asked for anything specific in these reviews."
                />
              </SectionCard>
            </Box>

            <SectionCard
              title="Negative reviews in depth"
              subtitle="Every complaint in the most recent few thousand reviews"
              icon={<SentimentDissatisfiedRoundedIcon sx={{ fontSize: 19 }} />}
            >
              {negatives ? (
                <NegativeReviewList
                  reviews={negatives.reviews}
                  scanned={negatives.scanned}
                  truncated={negatives.truncated}
                />
              ) : (
                <Stack spacing={2} alignItems="flex-start">
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                    The panels above sample a handful. This walks Play page by page and pulls back every 1 and 2
                    star review in the most recent few thousand — usually several hundred complaints. Takes about
                    20 seconds.
                  </Typography>

                  {negativesError ? (
                    <Alert severity="error" sx={{ width: '100%' }}>
                      {negativesError.message}
                      {negativesError.hint ? ` ${negativesError.hint}` : null}
                    </Alert>
                  ) : null}

                  <Button
                    variant="contained"
                    onClick={() => void loadNegatives()}
                    disabled={negativesLoading}
                    startIcon={
                      negativesLoading ? <CircularProgress size={16} color="inherit" /> : <SentimentDissatisfiedRoundedIcon />
                    }
                  >
                    {negativesLoading ? 'Reading reviews…' : 'Load negative reviews'}
                  </Button>
                </Stack>
              )}
            </SectionCard>
          </>
        ) : (
          <SectionCard title="Review analysis">
            <EmptyState
              title="No reviews analysed for this app yet"
              description="The research spent its review budget on the apps carrying the most signal. Run a deep dive to pull and analyse this app's reviews on demand."
              action={
                <Button onClick={() => void deepDive()} variant="contained" disabled={loading}>
                  {loading ? 'Analysing…' : 'Analyse reviews'}
                </Button>
              }
              compact
            />
          </SectionCard>
        )}

        {/* Similar apps --------------------------------------------------- */}
        {competitor.similarApps && competitor.similarApps.length > 0 ? (
          <SectionCard title="Similar apps" subtitle="Google Play's own recommendations">
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              }}
            >
              {competitor.similarApps.map((similar) => (
                <Stack
                  key={similar.appId}
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'surface.subtle',
                  }}
                >
                  <AppIcon src={similar.icon} title={similar.title} size={34} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {similar.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {similar.score ? `${rating(similar.score)} ★ · ` : ''}
                      {similar.developer}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
          </SectionCard>
        ) : null}
      </Stack>

      <Dialog open={Boolean(lightbox)} onClose={() => setLightbox(null)} maxWidth="md">
        <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          {lightbox ? (
            <Box
              component="img"
              src={lightbox}
              alt={`${competitor.title} screenshot`}
              sx={{ maxWidth: '100%', maxHeight: '82vh', borderRadius: 2 }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function MetaStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography component="div" sx={{ fontWeight: 650, fontSize: '1.0625rem', mt: 0.125 }}>
        {value}
      </Typography>
    </Box>
  );
}
