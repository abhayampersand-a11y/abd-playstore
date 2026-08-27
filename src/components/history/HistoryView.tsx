'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { EmptyState, TableSkeleton } from '@/components/common/States';
import { ResearchList } from '@/components/dashboard/ResearchList';
import { useResearchStore } from '@/lib/store/ResearchStore';
import type { Recommendation } from '@/lib/types';

type Filter = 'all' | Recommendation | 'unanalysed';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All research' },
  { value: 'STRONG', label: 'Strong opportunities' },
  { value: 'MODERATE', label: 'Moderate opportunities' },
  { value: 'LOW', label: 'Low opportunities' },
  { value: 'unanalysed', label: 'Not yet analysed' },
];

export function HistoryView() {
  const { items, ready } = useResearchStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !item.keyword.toLowerCase().includes(needle) && !(item.appName ?? '').toLowerCase().includes(needle)) {
        return false;
      }
      if (filter === 'all') return true;
      if (filter === 'unanalysed') return !item.recommendation;
      return item.recommendation === filter;
    });
  }, [items, query, filter]);

  return (
    <Box>
      <PageHeader
        title="Research History"
        description="Every market you have investigated, with the verdict AppScout reached."
        crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Research History' }]}
        action={
          <Button component={NextLink} href="/research/new" variant="contained" startIcon={<AddRoundedIcon />}>
            Research New Idea
          </Button>
        }
      />

      <SectionCard
        title={`${filtered.length} ${filtered.length === 1 ? 'research' : 'researches'}`}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search keywords"
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
                htmlInput: { 'aria-label': 'Search research history' },
              }}
            />
            <TextField
              select
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
              size="small"
              sx={{ width: { xs: '100%', sm: 208 } }}
              slotProps={{ htmlInput: { 'aria-label': 'Filter by verdict' } }}
            >
              {FILTERS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
        disablePadding
      >
        {!ready ? (
          <TableSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<HistoryRoundedIcon />}
            title={items.length === 0 ? 'No research yet' : 'Nothing matches those filters'}
            description={
              items.length === 0
                ? 'Every research you run is saved here, so you can compare markets side by side over time.'
                : 'Try a different keyword or clear the verdict filter.'
            }
            action={
              items.length === 0 ? (
                <Button component={NextLink} href="/research/new" variant="contained" startIcon={<AddRoundedIcon />}>
                  Research New Idea
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                  variant="outlined"
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <ResearchList items={filtered} />
        )}
      </SectionCard>
    </Box>
  );
}
