'use client';

import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { StageStepper } from '@/components/common/StageStepper';
import { EmptyState, ErrorState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { relativeTime } from '@/lib/format';
import { WORKSPACE_STAGES, type WorkspaceStageId } from '@/lib/research/stages';
import { useResearchStore } from '@/lib/store/ResearchStore';
import { labelForCountry, labelForLanguage } from '@/lib/validation';
import { useResearchWorkspace } from './ResearchWorkspaceProvider';

/** Derive the active stage from the URL rather than tracking it in state. */
function activeStageFrom(pathname: string, researchId: string): WorkspaceStageId {
  const base = `/research/${researchId}`;
  const suffix = pathname.startsWith(base) ? pathname.slice(base.length) : '';

  // A single-app deep dive is still the Competitors stage of the flow.
  if (suffix.startsWith('/competitor/')) return 'competitors';

  const match = WORKSPACE_STAGES.filter((stage) => stage.segment.length > 0).find((stage) =>
    suffix.startsWith(stage.segment),
  );

  return match?.id ?? 'overview';
}

export function WorkspaceChrome({ children }: { children: ReactNode }) {
  const { record, loading, error, unlocked, researchId, update } = useResearchWorkspace();
  const { refresh } = useResearchStore();
  const pathname = usePathname();
  const toast = useToast();

  const activeStage = useMemo(() => activeStageFrom(pathname, researchId), [pathname, researchId]);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={260} height={44} />
        <Skeleton variant="text" width={420} height={22} sx={{ mb: 2.5 }} />
        <Skeleton variant="rounded" height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  if (error || !record) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto' }}>
        <ErrorState error={error} />
        <EmptyState
          icon={<HistoryRoundedIcon />}
          title="This research is not on this device"
          description="Research is stored in your browser, so it will not appear in another browser, another device or a private window."
          action={
            <Stack direction="row" spacing={1.5}>
              <Button component={NextLink} href="/history" variant="outlined">
                View history
              </Button>
              <Button component={NextLink} href="/research/new" variant="contained">
                Start new research
              </Button>
            </Stack>
          }
        />
      </Box>
    );
  }

  const toggleSaved = async () => {
    try {
      await update({ saved: !record.saved });
      await refresh();
      toast.success(record.saved ? 'Removed from saved ideas' : 'Saved to your ideas');
    } catch {
      // `update` rolls the record back when the write fails, so the bookmark
      // returns to its old state and the toast must not claim otherwise.
      toast.error('Could not save that change. Check your connection and try again.');
    }
  };

  return (
    <Box>
      <PageHeader
        title={record.input.keyword}
        description={
          record.analysis?.recommendedApp
            ? `${record.analysis.recommendedApp.name} — ${record.analysis.recommendedApp.tagline}`
            : 'Google Play market research'
        }
        crumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Research History', href: '/history' },
          { label: record.input.keyword },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              onClick={() => void toggleSaved()}
              variant={record.saved ? 'contained' : 'outlined'}
              startIcon={record.saved ? <BookmarkRoundedIcon /> : <BookmarkBorderRoundedIcon />}
            >
              {record.saved ? 'Saved' : 'Save idea'}
            </Button>
            <Button
              component={NextLink}
              href={`/research/new?keyword=${encodeURIComponent(record.input.keyword)}`}
              variant="outlined"
              startIcon={<ReplayRoundedIcon />}
            >
              Re-run
            </Button>
          </Stack>
        }
        meta={
          <Stack spacing={2}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.75 }}>
              <Chip size="small" variant="outlined" label={labelForCountry(record.input.country)} />
              <Chip size="small" variant="outlined" label={labelForLanguage(record.input.language)} />
              <Chip
                size="small"
                variant="outlined"
                label={`${record.marketStats.competitorsAnalysed} competitors`}
              />
              <Chip size="small" variant="outlined" label={`${record.marketStats.reviewsAnalysed} reviews`} />
              <Chip size="small" variant="outlined" label={relativeTime(record.createdAt)} />
            </Stack>

            <StageStepper researchId={researchId} activeStage={activeStage} unlocked={unlocked} />
          </Stack>
        }
      />

      {children}

      {record.usage.calls > 0 ? (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 4, textAlign: 'right' }}>
          {record.usage.calls} AI {record.usage.calls === 1 ? 'call' : 'calls'} ·{' '}
          {record.usage.inputTokens.toLocaleString('en')} in / {record.usage.outputTokens.toLocaleString('en')} out
        </Typography>
      ) : null}
    </Box>
  );
}
