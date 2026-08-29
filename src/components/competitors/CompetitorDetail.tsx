'use client';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import NewReleasesRoundedIcon from '@mui/icons-material/NewReleasesRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { RatingDistributionChart } from '@/components/charts/RatingDistributionChart';
import { SentimentChart } from '@/components/charts/SentimentChart';
import { ThemeBarChart } from '@/components/charts/ThemeBarChart';
import { CopyButton } from '@/components/common/CopyButton';
import { SectionCard } from '@/components/common/SectionCard';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState, ErrorState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { QuoteList } from '@/components/research/QuoteList';
import { useResearchWorkspace } from '@/components/research/ResearchWorkspaceProvider';
import { fetchCompetitorDetail, fetchCompetitorExtras, fetchNegativeReviews } from '@/lib/api-client';
import { toAppError, type AppError } from '@/lib/errors';
import { compactNumber, daysSince, formatDate, percent, rating, relativeTime } from '@/lib/format';
import type {
  Competitor,
  CompetitorDossier,
  CompetitorSummary,
  DataSafetyEntry,
  NegativeReviewsResponse,
} from '@/lib/types';
import { AppIcon } from './AppIcon';
import { NegativeReviewList } from './NegativeReviewList';

/**
 * One competitor, in full.
 *
 * This is the page someone reads when they are deciding whether to build into
 * this market, so it shows everything Play publishes about the app - not only
 * the metrics the research pipeline scores on. Two sources feed it:
 *
 *   - the stored record, which has the listing as it looked when the research
 *     ran, plus whatever review analysis has been done;
 *   - a live lookup fired on open (`/api/competitor/extras`), which re-scrapes
 *     the listing and adds permissions, data safety, the developer's catalogue
 *     and Play's similar apps.
 *
 * The lookup is best-effort in both directions: the page renders fully from the
 * stored record while it is in flight, and a lookup Play refuses costs one
 * panel - which says so, rather than pretending the answer was "none".
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

  const [dossier, setDossier] = useState<CompetitorDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  const country = record?.input.country;
  const language = record?.input.language;

  const stored = useMemo(
    () => record?.competitors.find((entry) => entry.appId === appId),
    [record, appId],
  );

  useEffect(() => {
    if (!country || !language) return;

    const controller = new AbortController();
    setDossier(null);
    setDossierLoading(true);

    fetchCompetitorExtras({ appId, country, language }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDossier(result);
      })
      // A failed lookup is not worth an error banner: everything the research
      // stored still renders, and the panels it feeds say they are missing.
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setDossierLoading(false);
      });

    return () => controller.abort();
  }, [appId, country, language]);

  /**
   * The live listing wins over the stored one field by field: same app, scraped
   * today, and it carries what the pipeline never kept. Rank and the review
   * analysis exist only in the record, so they are put back.
   */
  const competitor = useMemo<Competitor | undefined>(() => {
    if (!stored) return undefined;
    if (!dossier) return stored;
    return {
      ...stored,
      ...dossier.competitor,
      rank: stored.rank,
      reviewStats: stored.reviewStats,
      similarApps: dossier.competitor.similarApps?.length
        ? dossier.competitor.similarApps
        : stored.similarApps,
    };
  }, [stored, dossier]);

  const loadNegatives = useCallback(async () => {
    if (!record || !stored) return;
    setNegativesLoading(true);
    setNegativesError(null);
    try {
      setNegatives(
        await fetchNegativeReviews({
          appId: stored.appId,
          country: record.input.country,
          language: record.input.language,
        }),
      );
    } catch (caught) {
      setNegativesError(toAppError(caught));
    } finally {
      setNegativesLoading(false);
    }
  }, [record, stored]);

  const deepDive = useCallback(async () => {
    if (!record || !stored) return;
    setLoading(true);
    setError(null);
    try {
      const { competitor: fresh, reviewsAnalysed } = await fetchCompetitorDetail({
        appId: stored.appId,
        country: record.input.country,
        language: record.input.language,
        reviewCount: 120,
      });

      // Merged onto the stored competitor, never onto the view built above: the
      // live extras are reading material and have no business in the record.
      const merged: Competitor = { ...stored, ...fresh, rank: stored.rank };
      await update({
        competitors: record.competitors.map((entry) => (entry.appId === appId ? merged : entry)),
      });

      toast.success(
        reviewsAnalysed > 0
          ? `Analysed ${reviewsAnalysed} reviews for ${stored.title}`
          : `No written reviews available for ${stored.title}`,
      );
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError);
      toast.error(appError.message, 'Deep dive failed');
    } finally {
      setLoading(false);
    }
  }, [record, stored, appId, update, toast]);

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
  const signals = buildSignals(competitor, record.marketStats.averageRating);
  const permissionGroups = groupBy(competitor.permissions ?? [], (entry) => entry.type);
  const dataSafety = competitor.dataSafety;
  const missing = new Set(dossier?.unavailable ?? []);
  const market = record.input.country.toUpperCase();

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
              {competitor.summary ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>
                  {competitor.summary}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.75, rowGap: 0.75 }}>
                {competitor.genre ? <Chip label={competitor.genre} size="small" variant="outlined" /> : null}
                {/* Play tags a game with a dozen categories; the header takes the
                    first few and the Technical panel lists the rest. */}
                {(competitor.categories ?? [])
                  .filter((category) => category.name !== competitor.genre)
                  .slice(0, 4)
                  .map((category) => (
                    <Chip key={category.name} label={category.name} size="small" variant="outlined" />
                  ))}
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
                {competitor.inPlayPass ? (
                  <Chip label="Play Pass" size="small" variant="outlined" color="primary" />
                ) : null}
                {competitor.earlyAccess ? (
                  <Chip label="Early access" size="small" variant="outlined" color="primary" />
                ) : null}
                {competitor.preregister ? (
                  <Chip label="Pre-registration" size="small" variant="outlined" color="primary" />
                ) : null}
                {competitor.available === false ? (
                  <Chip label={`Not available in ${market}`} size="small" variant="outlined" color="warning" />
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
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
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
            <MetaStat label="Released" value={competitor.released ?? '—'} />
            <MetaStat label="Updated" value={formatDate(competitor.updated)} />
            <MetaStat label="Version" value={versionLabel(competitor.version)} />
            <MetaStat label="Requires Android" value={androidLabel(competitor.androidVersion)} />
          </Box>

          {dossierLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2.5 }}>
              <CircularProgress size={13} />
              <Typography variant="caption" color="text.secondary">
                Reading the rest of the listing from Google Play…
              </Typography>
            </Stack>
          ) : null}
        </Card>

        {/* Build signals -------------------------------------------------- */}
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="baseline" sx={{ mb: 1.5 }}>
            <InsightsRoundedIcon sx={{ fontSize: 19, color: 'text.secondary', alignSelf: 'center' }} />
            <Typography variant="h5" component="h3">
              Build signals
            </Typography>
            <Typography variant="body2" color="text.secondary">
              — what this listing says about the opening
            </Typography>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            }}
          >
            {signals.map((signal) => (
              <StatCard
                key={signal.label}
                label={signal.label}
                value={signal.value}
                caption={signal.caption}
                delta={signal.delta}
              />
            ))}
            {dataSafety ? (
              <StatCard
                label="Data appetite"
                value={dataSafety.collected.length}
                caption={`Data types collected · ${dataSafety.shared.length} shared with third parties`}
                delta={
                  dataSafety.shared.length > 0
                    ? { label: 'Data sharing is something you could undercut', tone: 'neutral' }
                    : undefined
                }
              />
            ) : null}
          </Box>
        </Box>

        {/* What's new ----------------------------------------------------- */}
        {competitor.recentChanges ? (
          <SectionCard
            title="What's new"
            subtitle={`Shipped in version ${versionLabel(competitor.version)} · ${relativeTime(competitor.updated)}`}
            icon={<NewReleasesRoundedIcon sx={{ fontSize: 19 }} />}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              {competitor.recentChanges}
            </Typography>
          </SectionCard>
        ) : null}

        {/* Listing facts -------------------------------------------------- */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard
            title="Monetisation"
            subtitle="How this app takes money"
            icon={<PaymentsRoundedIcon sx={{ fontSize: 19 }} />}
          >
            <Box>
              <DetailRow label="Price" value={priceLabel(competitor)} />
              {competitor.originalPrice ? (
                <DetailRow
                  label="Before discount"
                  value={`${competitor.originalPrice} ${competitor.currency ?? ''}`.trim()}
                />
              ) : null}
              <DetailRow
                label="In-app purchases"
                value={competitor.offersIAP ? (competitor.iapRange ?? 'Yes') : 'None'}
              />
              <DetailRow label="Advertising" value={competitor.adSupported ? 'Contains ads' : 'No ads'} />
              <DetailRow label="Play Pass" value={competitor.inPlayPass ? 'Included' : 'Not included'} />
              <DetailRow
                label="Availability"
                value={competitor.available === false ? `Not served in ${market}` : `Live in ${market}`}
              />
              {competitor.preregister || competitor.earlyAccess ? (
                <DetailRow
                  label="Launch state"
                  value={competitor.preregister ? 'Pre-registration' : 'Early access'}
                />
              ) : null}
            </Box>
          </SectionCard>

          <SectionCard
            title="Technical"
            subtitle="What it targets, and when it ships"
            icon={<MemoryRoundedIcon sx={{ fontSize: 19 }} />}
          >
            <Box>
              <DetailRow label="Current version" value={versionLabel(competitor.version)} />
              <DetailRow label="Requires Android" value={androidLabel(competitor.androidVersion)} />
              {competitor.androidMaxVersion ? (
                <DetailRow label="Tested up to Android" value={competitor.androidMaxVersion} />
              ) : null}
              <DetailRow label="Released" value={competitor.released ?? '—'} />
              <DetailRow
                label="Last updated"
                value={`${formatDate(competitor.updated)} (${relativeTime(competitor.updated)})`}
              />
              <DetailRow
                label="Content rating"
                value={
                  competitor.contentRatingDescription
                    ? `${competitor.contentRating ?? '—'} · ${competitor.contentRatingDescription}`
                    : (competitor.contentRating ?? '—')
                }
              />
              {competitor.categories?.length ? (
                <DetailRow
                  label="Categories"
                  value={competitor.categories.map((category) => category.name).join(', ')}
                />
              ) : null}
              <DetailRow
                label="Package name"
                value={
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                    <Box component="code" sx={{ fontSize: '0.8125rem' }}>
                      {competitor.appId}
                    </Box>
                    <CopyButton value={competitor.appId} size="small" sx={{ minWidth: 0, px: 0.75 }} />
                  </Stack>
                }
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              No download size: Google publishes it only inside the Play Store app, never on the web listing this
              data is read from.
            </Typography>
          </SectionCard>
        </Box>

        {/* Promo video ---------------------------------------------------- */}
        {competitor.video ? (
          <SectionCard
            title="Promo video"
            subtitle="The pitch the developer leads with"
            icon={<PlayCircleFilledRoundedIcon sx={{ fontSize: 19 }} />}
          >
            <Link
              href={competitor.video}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'inline-block', position: 'relative', lineHeight: 0 }}
            >
              {competitor.videoImage ? (
                <Box
                  component="img"
                  src={competitor.videoImage}
                  alt={`${competitor.title} promo video`}
                  loading="lazy"
                  sx={{ display: 'block', maxWidth: '100%', width: 420, borderRadius: 2.5 }}
                />
              ) : (
                <Typography variant="body2">Watch the promo video</Typography>
              )}
              {competitor.videoImage ? (
                <PlayCircleFilledRoundedIcon
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    margin: 'auto',
                    fontSize: 56,
                    color: 'common.white',
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))',
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
            </Link>
          </SectionCard>
        ) : null}

        {/* Screenshots ---------------------------------------------------- */}
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

        {/* Description ---------------------------------------------------- */}
        {competitor.description ? (
          <SectionCard title="Description">
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              {competitor.description}
            </Typography>
          </SectionCard>
        ) : null}

        {/* Permissions and data safety ------------------------------------ */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard
            title="Permissions"
            subtitle={
              competitor.permissions?.length
                ? `${competitor.permissions.length} declared — the device access you would have to match`
                : 'The device access this app declares'
            }
            icon={<VpnKeyRoundedIcon sx={{ fontSize: 19 }} />}
          >
            {competitor.permissions?.length ? (
              <Stack spacing={1.75}>
                {permissionGroups.map(([type, entries]) => (
                  <Box key={type}>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                      {type}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, rowGap: 0.75 }}>
                      {entries.map((entry) => (
                        <Chip key={entry.permission} label={entry.permission} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Pending
                loading={dossierLoading}
                missing={missing.has('Permissions')}
                empty="This app declares no special permissions."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Data safety"
            subtitle="What the developer declares it does with user data"
            icon={<ShieldRoundedIcon sx={{ fontSize: 19 }} />}
          >
            {dataSafety ? (
              <Stack spacing={2}>
                <DataSafetyList title={`Collected (${dataSafety.collected.length})`} entries={dataSafety.collected} />
                <DataSafetyList
                  title={`Shared with third parties (${dataSafety.shared.length})`}
                  entries={dataSafety.shared}
                />
                {dataSafety.securityPractices.length > 0 ? (
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                      Security practices
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, rowGap: 0.75 }}>
                      {dataSafety.securityPractices.map((practice) => (
                        <Chip
                          key={practice.practice}
                          label={practice.practice}
                          size="small"
                          variant="outlined"
                          color="success"
                        />
                      ))}
                    </Stack>
                  </Box>
                ) : null}
                {dataSafety.privacyPolicyUrl ? (
                  <Link href={dataSafety.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" variant="body2">
                    Privacy policy
                  </Link>
                ) : null}
              </Stack>
            ) : (
              <Pending
                loading={dossierLoading}
                missing={missing.has('Data safety')}
                empty="This app has not filled in Play's data safety form."
              />
            )}
          </SectionCard>
        </Box>

        {/* Developer ------------------------------------------------------ */}
        <SectionCard
          title="Developer"
          subtitle={competitor.developerLegalName ?? competitor.developer}
          icon={<BusinessRoundedIcon sx={{ fontSize: 19 }} />}
        >
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '320px 1fr' } }}>
            <Box>
              <DetailRow label="Name on Play" value={competitor.developer} />
              {competitor.developerLegalName ? (
                <DetailRow label="Legal name" value={competitor.developerLegalName} />
              ) : null}
              {competitor.developerEmail ? (
                <DetailRow
                  label="Contact"
                  value={
                    <Link href={`mailto:${competitor.developerEmail}`} variant="body2">
                      {competitor.developerEmail}
                    </Link>
                  }
                />
              ) : null}
              {competitor.developerWebsite ? (
                <DetailRow
                  label="Website"
                  value={
                    <Link href={competitor.developerWebsite} target="_blank" rel="noopener noreferrer" variant="body2">
                      {hostname(competitor.developerWebsite)}
                    </Link>
                  }
                />
              ) : null}
              {competitor.privacyPolicy ? (
                <DetailRow
                  label="Privacy policy"
                  value={
                    <Link href={competitor.privacyPolicy} target="_blank" rel="noopener noreferrer" variant="body2">
                      {hostname(competitor.privacyPolicy)}
                    </Link>
                  }
                />
              ) : null}
              {competitor.developerAddress ? (
                <DetailRow label="Address" value={competitor.developerAddress} />
              ) : null}
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Everything else they publish
              </Typography>
              {competitor.developerApps?.length ? (
                <AppGrid apps={competitor.developerApps} />
              ) : (
                <Pending
                  loading={dossierLoading}
                  missing={missing.has('Developer catalogue')}
                  empty="This is their only app, or Play files them under an old-style developer id it will not answer for."
                />
              )}
            </Box>
          </Box>
        </SectionCard>

        {/* Review analysis ------------------------------------------------ */}
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
        <SectionCard title="Similar apps" subtitle="Google Play's own recommendations">
          {competitor.similarApps?.length ? (
            <AppGrid apps={competitor.similarApps} />
          ) : (
            <Pending
              loading={dossierLoading}
              missing={missing.has('Similar apps')}
              empty="Play suggests nothing comparable for this app."
            />
          )}
        </SectionCard>
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

// ---------------------------------------------------------------------------
// Reading the listing
// ---------------------------------------------------------------------------

interface Signal {
  label: string;
  value: ReactNode;
  caption?: string;
  delta?: { label: string; tone: 'good' | 'critical' | 'neutral' };
}

/**
 * The listing turned into the handful of judgements someone deciding what to
 * build actually makes: how big, how liked, how many unhappy users, how alive,
 * how old, how vocal, and how it earns.
 *
 * Tone here is written from the *challenger's* seat, which inverts twice: an
 * actively maintained incumbent is bad news for you, and an abandoned one is an
 * opening. Every threshold is a rule of thumb, so each says what it means in
 * words instead of leaving a bare number to be read as precision.
 */
function buildSignals(competitor: Competitor, marketAverageRating: number): Signal[] {
  const signals: Signal[] = [];

  const installs = competitor.minInstalls ?? 0;
  signals.push({
    label: 'Reach',
    value: compactNumber(competitor.minInstalls),
    caption: competitor.installs ? `${competitor.installs} on Play` : 'Minimum installs',
    delta:
      installs >= 10_000_000
        ? { label: 'Entrenched incumbent', tone: 'critical' }
        : installs >= 100_000
          ? { label: 'Proven demand at a beatable scale', tone: 'good' }
          : { label: 'Small — the niche may be small too', tone: 'neutral' },
  });

  const gap =
    competitor.score !== undefined && marketAverageRating > 0
      ? competitor.score - marketAverageRating
      : undefined;
  signals.push({
    label: 'Rating',
    value: rating(competitor.score),
    caption: `${compactNumber(competitor.ratingCount)} ratings`,
    delta:
      gap === undefined
        ? undefined
        : {
            label: `${gap >= 0 ? '+' : ''}${gap.toFixed(2)} against this market's average`,
            tone: gap >= 0 ? 'critical' : 'good',
          },
  });

  const histogram = competitor.histogram;
  const ratedTotal = histogram
    ? (['1', '2', '3', '4', '5'] as const).reduce((sum, star) => sum + histogram[star], 0)
    : 0;
  if (histogram && ratedTotal > 0) {
    const unhappy = histogram['1'] + histogram['2'];
    const share = (unhappy / ratedTotal) * 100;
    signals.push({
      label: 'Unhappy users',
      value: percent(share, 1),
      caption: `${compactNumber(unhappy)} one and two star ratings`,
      delta:
        share >= 20
          ? { label: 'A wide opening — read the complaints', tone: 'good' }
          : share >= 10
            ? { label: 'Ordinary level of dissatisfaction', tone: 'neutral' }
            : { label: 'Users would be hard to peel away', tone: 'critical' },
    });
  }

  const updatedAge = daysSince(competitor.updated);
  signals.push({
    label: 'Maintenance',
    value: updatedAge === undefined ? '—' : relativeTime(competitor.updated),
    caption: `Version ${versionLabel(competitor.version)}`,
    delta:
      updatedAge === undefined
        ? undefined
        : updatedAge <= 90
          ? { label: 'Actively maintained — expect a response', tone: 'critical' }
          : updatedAge <= 365
            ? { label: 'Slowing down', tone: 'neutral' }
            : { label: 'Effectively abandoned', tone: 'good' },
  });

  const ageDays = daysSince(competitor.released);
  if (ageDays !== undefined) {
    const years = ageDays / 365;
    signals.push({
      label: 'Age on Play',
      value: `${years.toFixed(1)} yrs`,
      caption: competitor.released ? `Released ${competitor.released}` : undefined,
      delta:
        years >= 8
          ? { label: 'Old codebase — often dated UX', tone: 'good' }
          : years <= 2
            ? { label: 'Recent entrant', tone: 'neutral' }
            : undefined,
    });
  }

  if (competitor.ratingCount && competitor.minInstalls) {
    const perThousand = (competitor.ratingCount / competitor.minInstalls) * 1000;
    signals.push({
      label: 'Vocal users',
      value: perThousand.toFixed(1),
      caption: 'Ratings per 1,000 installs',
      delta:
        perThousand >= 10
          ? { label: 'Engaged base — reviews are worth mining', tone: 'good' }
          : { label: 'Quiet base — little written feedback', tone: 'neutral' },
    });
  }

  const earners = [
    competitor.adSupported ? 'ads' : null,
    competitor.offersIAP ? 'in-app purchases' : null,
    competitor.free ? null : 'an up-front price',
  ].filter(Boolean);
  signals.push({
    label: 'Monetisation',
    value: competitor.free ? 'Free' : (competitor.priceText ?? 'Paid'),
    caption: earners.length > 0 ? `Earns through ${earners.join(' and ')}` : 'No visible monetisation',
    delta: competitor.iapRange ? { label: `IAP ${competitor.iapRange}`, tone: 'neutral' } : undefined,
  });

  return signals;
}

function priceLabel(competitor: Competitor): string {
  if (competitor.free) return 'Free';
  if (competitor.priceText) return competitor.priceText;
  if (competitor.price !== undefined) return `${competitor.price} ${competitor.currency ?? ''}`.trim();
  return 'Paid';
}

/**
 * Play stopped publishing download size on the web listing, so there is no
 * "Size" stat to show anywhere on this page; version and minimum Android are
 * what the listing still carries.
 *
 * The scraper reports the literal 'VARY' for apps whose build differs per
 * device, which is not a version anyone wants to read.
 */
function versionLabel(version: string | undefined): string {
  if (!version || version === 'VARY') return 'Varies';
  return version;
}

function androidLabel(value: string | undefined): string {
  if (!value) return '—';
  if (/varies/i.test(value)) return 'Varies';
  // Numeric values are a floor ("5.0"); anything with words is already prose.
  return /[a-z]/i.test(value) ? value : `${value}+`;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www[.]/, '');
  } catch {
    return url;
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return [...groups.entries()];
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      justifyContent="space-between"
      alignItems="baseline"
      sx={{
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0, pb: 0 },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        component="div"
        variant="body2"
        sx={{ fontWeight: 600, textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/** One half of the data safety table, collapsed to "group: the data in it". */
function DataSafetyList({ title, entries }: { title: string; entries: DataSafetyEntry[] }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
        {title}
      </Typography>
      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Nothing declared.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          {groupBy(entries, (entry) => entry.type).map(([type, rows]) => (
            <Box key={type}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {type}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {rows.map((row) => row.data).join(', ')}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function AppGrid({ apps }: { apps: CompetitorSummary[] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      {apps.map((app) => (
        <Stack
          key={app.appId}
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
          <AppIcon src={app.icon} title={app.title} size={34} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {app.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {app.score ? `${rating(app.score)} ★ · ` : ''}
              {app.developer}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Box>
  );
}

/**
 * The three states an empty panel can be in, kept apart on purpose: "still
 * loading", "Play would not answer" and "the answer is genuinely nothing" mean
 * very different things to someone sizing up a competitor.
 */
function Pending({ loading, missing, empty }: { loading: boolean; missing: boolean; empty: string }) {
  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={13} />
        <Typography variant="body2" color="text.secondary">
          Reading from Google Play…
        </Typography>
      </Stack>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {missing ? 'Google Play did not answer this lookup for this app.' : empty}
    </Typography>
  );
}
