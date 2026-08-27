'use client';

import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { compactNumber, formatDate, rating } from '@/lib/format';
import type { Competitor } from '@/lib/types';
import { AppIcon } from './AppIcon';

type SortKey = 'rank' | 'score' | 'ratingCount' | 'minInstalls' | 'updated';

interface CompetitorTableProps {
  competitors: Competitor[];
  onSelect?: (competitor: Competitor) => void;
}

const COLUMNS: Array<{ key: SortKey | 'app' | 'price' | 'category'; label: string; numeric?: boolean; sortable?: boolean }> = [
  { key: 'app', label: 'App' },
  { key: 'score', label: 'Rating', numeric: true, sortable: true },
  { key: 'ratingCount', label: 'Ratings', numeric: true, sortable: true },
  { key: 'minInstalls', label: 'Installs', numeric: true, sortable: true },
  { key: 'price', label: 'Price' },
  { key: 'category', label: 'Category' },
  { key: 'updated', label: 'Updated', sortable: true },
];

export function CompetitorTable({ competitors, onSelect }: CompetitorTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [descending, setDescending] = useState(false);

  const sorted = useMemo(() => {
    const read = (competitor: Competitor): number => {
      switch (sortKey) {
        case 'score':
          return competitor.score ?? -1;
        case 'ratingCount':
          return competitor.ratingCount ?? -1;
        case 'minInstalls':
          return competitor.minInstalls ?? -1;
        case 'updated':
          return competitor.updated ? new Date(competitor.updated).getTime() : -1;
        default:
          return -competitor.rank;
      }
    };
    return [...competitors].sort((a, b) => (descending ? read(b) - read(a) : read(a) - read(b)));
  }, [competitors, sortKey, descending]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDescending((current) => !current);
    } else {
      setSortKey(key);
      setDescending(true);
    }
  };

  return (
    // The table scrolls inside its own container; the page never scrolls sideways.
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableCell
                key={column.key}
                align={column.numeric ? 'right' : 'left'}
                sortDirection={column.sortable && sortKey === column.key ? (descending ? 'desc' : 'asc') : false}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={sortKey === column.key}
                    direction={sortKey === column.key && descending ? 'desc' : 'asc'}
                    onClick={() => toggleSort(column.key as SortKey)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
            <TableCell align="right" sx={{ width: 52 }} />
          </TableRow>
        </TableHead>

        <TableBody>
          {sorted.map((competitor) => (
            <TableRow
              key={competitor.appId}
              hover
              onClick={() => onSelect?.(competitor)}
              sx={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <TableCell sx={{ maxWidth: 320 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <AppIcon src={competitor.icon} title={competitor.title} size={38} />
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {competitor.title}
                      </Typography>
                      {competitor.adSupported ? (
                        <Tooltip title="Contains ads">
                          <CampaignRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        </Tooltip>
                      ) : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {competitor.developer}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={0.375} alignItems="center" justifyContent="flex-end">
                  <StarRoundedIcon sx={{ fontSize: 15, color: 'warning.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {rating(competitor.score)}
                  </Typography>
                </Stack>
              </TableCell>

              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                <Typography variant="body2" color="text.secondary">
                  {compactNumber(competitor.ratingCount)}
                </Typography>
              </TableCell>

              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {competitor.installs ?? compactNumber(competitor.minInstalls)}
                </Typography>
              </TableCell>

              <TableCell>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {competitor.free ? 'Free' : (competitor.priceText ?? 'Paid')}
                  </Typography>
                  {competitor.offersIAP ? (
                    <Tooltip title={competitor.iapRange ? `In-app purchases: ${competitor.iapRange}` : 'In-app purchases'}>
                      <Chip label="IAP" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.625rem' }} />
                    </Tooltip>
                  ) : null}
                </Stack>
              </TableCell>

              <TableCell sx={{ maxWidth: 160 }}>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {competitor.genre ?? '—'}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {formatDate(competitor.updated)}
                </Typography>
              </TableCell>

              <TableCell align="right">
                {onSelect ? (
                  <IconButton size="small" aria-label={`View analysis for ${competitor.title}`}>
                    <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
