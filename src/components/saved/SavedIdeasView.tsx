'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import BookmarkRemoveRoundedIcon from '@mui/icons-material/BookmarkRemoveRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useMemo } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { RecommendationBadge } from '@/components/common/Scores';
import { CardSkeleton, EmptyState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { ResearchList } from '@/components/dashboard/ResearchList';
import { relativeTime, score } from '@/lib/format';
import { useResearchStore } from '@/lib/store/ResearchStore';
import type { SavedIdea } from '@/lib/types';

/** Bookmarked ideas - the shortlist a developer actually returns to. */
export function SavedIdeasView() {
  const { savedIdeas, items, ready, toggleSaved } = useResearchStore();
  const toast = useToast();

  // Some saved researches may not have an analysis yet, so they have no idea
  // card. They still belong on this page, listed underneath.
  const savedWithoutIdea = useMemo(() => {
    const ideaIds = new Set(savedIdeas.map((idea) => idea.researchId));
    return items.filter((item) => item.saved && !ideaIds.has(item.id));
  }, [items, savedIdeas]);

  const unsave = async (idea: SavedIdea) => {
    try {
      await toggleSaved(idea.researchId);
      toast.success(`Removed “${idea.name}” from saved ideas`);
    } catch {
      toast.error('Could not update this idea.');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Saved Ideas"
        description="Your shortlist. Anything you bookmark from a research lands here."
        crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Saved Ideas' }]}
        action={
          <Button component={NextLink} href="/research/new" variant="contained" startIcon={<AddRoundedIcon />}>
            Research New Idea
          </Button>
        }
      />

      {!ready ? (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          <CardSkeleton height={140} />
          <CardSkeleton height={140} />
        </Box>
      ) : savedIdeas.length === 0 && savedWithoutIdea.length === 0 ? (
        <SectionCard title="Saved ideas">
          <EmptyState
            icon={<BookmarkRoundedIcon />}
            title="Nothing saved yet"
            description="Open any research and press Save idea. Bookmarked research is also protected from being evicted when browser storage fills up."
            action={
              <Button component={NextLink} href="/history" variant="outlined">
                Browse your research
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <Stack spacing={3}>
          {savedIdeas.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
              }}
            >
              {savedIdeas.map((idea) => (
                <Card key={idea.id} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h4" component="p" noWrap>
                        {idea.name}
                      </Typography>
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 550 }}>
                        {idea.tagline}
                      </Typography>
                    </Box>
                    <Tooltip title="Remove from saved">
                      <IconButton
                        size="small"
                        onClick={() => void unsave(idea)}
                        aria-label={`Remove ${idea.name} from saved ideas`}
                      >
                        <BookmarkRemoveRoundedIcon sx={{ fontSize: 19 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                    <RecommendationBadge recommendation={idea.recommendation} size="small" />
                    <Chip label={idea.keyword} size="small" variant="outlined" />
                  </Stack>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                    sx={{ mt: 'auto', pt: 2.5 }}
                  >
                    <Box>
                      <Typography
                        component="p"
                        sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}
                      >
                        {score(idea.opportunityScore)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        saved {relativeTime(idea.createdAt)}
                      </Typography>
                    </Box>
                    <Button component={NextLink} href={`/research/${idea.researchId}/opportunity`} size="small">
                      Open
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Box>
          ) : null}

          {savedWithoutIdea.length > 0 ? (
            <SectionCard
              title="Saved research without an analysis"
              subtitle="These are bookmarked but have not been scored yet"
              disablePadding
            >
              <ResearchList items={savedWithoutIdea} />
            </SectionCard>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
