'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState, TableSkeleton } from '@/components/common/States';
import { compactNumber, rating } from '@/lib/format';
import { useAllRecords } from '@/lib/store/useAllRecords';
import type { Competitor } from '@/lib/types';
import { CompetitorTable } from './CompetitorTable';

interface DirectoryEntry {
  competitor: Competitor;
  researchId: string;
  keyword: string;
  /** How many separate researches this app turned up in. */
  appearances: number;
}

/**
 * Every competitor across every research, de-duplicated by app id.
 *
 * The interesting signal here is `appearances`: an app that surfaces across
 * several unrelated keyword searches is a category-defining incumbent, which is
 * a different kind of competitor from one that only shows up in a niche.
 */
export function CompetitorDirectory() {
  const { records, loading } = useAllRecords();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('all');

  const entries = useMemo(() => {
    const byAppId = new Map<string, DirectoryEntry>();

    for (const record of records) {
      for (const competitor of record.competitors) {
        const existing = byAppId.get(competitor.appId);
        if (existing) {
          existing.appearances += 1;
          // Keep the richest copy - the one that has review analysis attached.
          if (!existing.competitor.reviewStats && competitor.reviewStats) {
            existing.competitor = competitor;
            existing.researchId = record.id;
            existing.keyword = record.input.keyword;
          }
        } else {
          byAppId.set(competitor.appId, {
            competitor,
            researchId: record.id,
            keyword: record.input.keyword,
            appearances: 1,
          });
        }
      }
    }

    return [...byAppId.values()].sort(
      (a, b) => b.appearances - a.appearances || (b.competitor.minInstalls ?? 0) - (a.competitor.minInstalls ?? 0),
    );
  }, [records]);

  const keywords = useMemo(
    () => [...new Set(records.map((record) => record.input.keyword))].sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (keywordFilter !== 'all' && entry.keyword !== keywordFilter) return false;
      if (!needle) return true;
      return (
        entry.competitor.title.toLowerCase().includes(needle) ||
        entry.competitor.developer.toLowerCase().includes(needle) ||
        (entry.competitor.genre ?? '').toLowerCase().includes(needle)
      );
    });
  }, [entries, query, keywordFilter]);

  const summary = useMemo(() => {
    const scored = entries.map((entry) => entry.competitor.score).filter((s): s is number => typeof s === 'number');
    return {
      total: entries.length,
      developers: new Set(entries.map((entry) => entry.competitor.developer.toLowerCase())).size,
      averageRating: scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : 0,
      installs: entries.reduce((sum, entry) => sum + (entry.competitor.minInstalls ?? 0), 0),
    };
  }, [entries]);

  const openCompetitor = (competitor: Competitor) => {
    const entry = entries.find((candidate) => candidate.competitor.appId === competitor.appId);
    if (!entry) return;
    router.push(`/research/${entry.researchId}/competitor/${encodeURIComponent(competitor.appId)}`);
  };

  return (
    <Box>
      <PageHeader
        title="Competitors"
        description="Every app you have come up against, pooled across all of your research."
        crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Competitors' }]}
      />

      {loading ? (
        <SectionCard title="Competitors" disablePadding>
          <TableSkeleton rows={8} />
        </SectionCard>
      ) : entries.length === 0 ? (
        <SectionCard title="Competitors">
          <EmptyState
            icon={<StorefrontRoundedIcon />}
            title="No competitors yet"
            description="Run a research and every app it turns up will be collected here."
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
            <StatCard label="Apps tracked" value={summary.total} caption="Unique across all research" />
            <StatCard label="Developers" value={summary.developers} caption="Distinct publishers" />
            <StatCard label="Average rating" value={rating(summary.averageRating)} caption="Across tracked apps" />
            <StatCard label="Combined installs" value={compactNumber(summary.installs)} caption="Minimum installs" />
          </Box>

          {entries.some((entry) => entry.appearances > 1) ? (
            <SectionCard
              title="Apps that keep showing up"
              subtitle="These surfaced in more than one of your keyword searches — the category incumbents"
            >
              <Stack direction="row" spacing={0.875} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.875 }}>
                {entries
                  .filter((entry) => entry.appearances > 1)
                  .slice(0, 12)
                  .map((entry) => (
                    <Chip
                      key={entry.competitor.appId}
                      label={`${entry.competitor.title} · ${entry.appearances}×`}
                      variant="outlined"
                      onClick={() => openCompetitor(entry.competitor)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
              </Stack>
            </SectionCard>
          ) : null}

          <SectionCard
            title={`${filtered.length} ${filtered.length === 1 ? 'app' : 'apps'}`}
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search apps"
                  size="small"
                  sx={{ width: { xs: '100%', sm: 200 } }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon sx={{ fontSize: 17 }} />
                        </InputAdornment>
                      ),
                    },
                    htmlInput: { 'aria-label': 'Search competitors' },
                  }}
                />
                <TextField
                  select
                  value={keywordFilter}
                  onChange={(event) => setKeywordFilter(event.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 200 } }}
                  slotProps={{ htmlInput: { 'aria-label': 'Filter by research keyword' } }}
                >
                  <MenuItem value="all">All keywords</MenuItem>
                  {keywords.map((keyword) => (
                    <MenuItem key={keyword} value={keyword}>
                      {keyword}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            }
            disablePadding
          >
            {filtered.length === 0 ? (
              <EmptyState
                title="Nothing matches those filters"
                description="Try a different search term or clear the keyword filter."
                compact
              />
            ) : (
              <CompetitorTable
                competitors={filtered.map((entry) => entry.competitor)}
                onSelect={openCompetitor}
              />
            )}
          </SectionCard>

          <Typography variant="caption" color="text.disabled">
            Clicking an app opens it inside the research it was first found in.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
