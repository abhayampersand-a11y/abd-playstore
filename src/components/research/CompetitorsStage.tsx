'use client';

import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import ViewModuleRoundedIcon from '@mui/icons-material/ViewModuleRounded';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { EmptyState } from '@/components/common/States';
import { CompetitorCard } from '@/components/competitors/CompetitorCard';
import { CompetitorTable } from '@/components/competitors/CompetitorTable';
import type { Competitor } from '@/lib/types';
import { useResearchWorkspace } from './ResearchWorkspaceProvider';
import { NextStepCard } from './NextStepCard';

type ViewMode = 'table' | 'cards';

/** Stage 2 - the full competitive set, in whichever shape the user prefers. */
export function CompetitorsStage() {
  const { record, researchId } = useResearchWorkspace();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('table');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!record) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return record.competitors;
    return record.competitors.filter(
      (competitor) =>
        competitor.title.toLowerCase().includes(needle) ||
        competitor.developer.toLowerCase().includes(needle) ||
        (competitor.genre ?? '').toLowerCase().includes(needle),
    );
  }, [record, query]);

  if (!record) return null;

  const openCompetitor = (competitor: Competitor) => {
    router.push(`/research/${researchId}/competitor/${encodeURIComponent(competitor.appId)}`);
  };

  return (
    <Box>
      <SectionCard
        title="Competitors"
        subtitle={`${record.competitors.length} apps analysed in ${record.input.country.toUpperCase()} — click any app for a full breakdown`}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter apps"
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
                htmlInput: { 'aria-label': 'Filter competitors' },
              }}
            />
            <ToggleButtonGroup
              value={view}
              exclusive
              size="small"
              onChange={(_, next: ViewMode | null) => next && setView(next)}
              aria-label="View mode"
            >
              <ToggleButton value="table" aria-label="Table view">
                <TableRowsRoundedIcon sx={{ fontSize: 17 }} />
              </ToggleButton>
              <ToggleButton value="cards" aria-label="Card view">
                <ViewModuleRoundedIcon sx={{ fontSize: 17 }} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        }
        disablePadding={view === 'table'}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<SearchOffRoundedIcon />}
            title="No competitors match that filter"
            description="Clear the filter to see every app from this research."
            compact
          />
        ) : view === 'table' ? (
          <CompetitorTable competitors={filtered} onSelect={openCompetitor} />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
                xl: 'repeat(4, 1fr)',
              },
            }}
          >
            {filtered.map((competitor) => (
              <CompetitorCard key={competitor.appId} competitor={competitor} onSelect={openCompetitor} />
            ))}
          </Box>
        )}
      </SectionCard>

      <NextStepCard record={record} />
    </Box>
  );
}
