'use client';

import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/common/ToastProvider';
import { plainNumber, relativeTime, score } from '@/lib/format';
import { useResearchStore } from '@/lib/store/ResearchStore';
import { labelForCountry } from '@/lib/validation';
import type { ResearchListItem } from '@/lib/types';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

/**
 * Shared research table used by the dashboard, history and saved views.
 * A row is a link to the workspace; the overflow menu carries the destructive
 * action so it never sits under a stray click.
 */
export function ResearchList({ items }: { items: ResearchListItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const { toggleSaved, removeRecord } = useResearchStore();

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuItem, setMenuItem] = useState<ResearchListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResearchListItem | null>(null);

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuItem(null);
  };

  const handleToggleSaved = async (item: ResearchListItem) => {
    closeMenu();
    try {
      const saved = await toggleSaved(item.id);
      toast.success(saved ? 'Saved to your ideas' : 'Removed from saved ideas');
    } catch {
      toast.error('Could not update this research.');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await removeRecord(target.id);
      toast.success(`Deleted research for “${target.keyword}”`);
    } catch {
      toast.error('Could not delete this research.');
    }
  };

  return (
    <>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 780 }}>
          <TableHead>
            <TableRow>
              <TableCell>Keyword</TableCell>
              <TableCell>Market</TableCell>
              <TableCell align="right">Competitors</TableCell>
              <TableCell align="right">Reviews</TableCell>
              <TableCell align="right">Score</TableCell>
              <TableCell>Run</TableCell>
              <TableCell align="right" sx={{ width: 52 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => router.push(`/research/${item.id}`)}
              >
                <TableCell sx={{ maxWidth: 280 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {item.saved ? (
                      <Tooltip title="Saved idea">
                        <BookmarkRoundedIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                      </Tooltip>
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {item.keyword}
                      </Typography>
                      {item.appName ? (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {item.appName}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {labelForCountry(item.country)}
                  </Typography>
                </TableCell>

                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  <Typography variant="body2" color="text.secondary">
                    {plainNumber(item.competitorsAnalysed)}
                  </Typography>
                </TableCell>

                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  <Typography variant="body2" color="text.secondary">
                    {plainNumber(item.reviewsAnalysed)}
                  </Typography>
                </TableCell>

                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {typeof item.opportunityScore === 'number' ? score(item.opportunityScore) : '—'}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {relativeTime(item.createdAt)}
                  </Typography>
                </TableCell>

                <TableCell align="right">
                  <IconButton
                    size="small"
                    aria-label={`Actions for ${item.keyword}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuAnchor(event.currentTarget);
                      setMenuItem(item);
                    }}
                  >
                    <MoreVertRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => menuItem && void handleToggleSaved(menuItem)}>
          <ListItemIcon>
            {menuItem?.saved ? (
              <BookmarkRoundedIcon fontSize="small" />
            ) : (
              <BookmarkBorderRoundedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{menuItem?.saved ? 'Remove from saved' : 'Save this idea'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setPendingDelete(menuItem);
            closeMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete research</ListItemText>
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this research?"
        description={
          pendingDelete
            ? `“${pendingDelete.keyword}” and its competitor, review and AI analysis data will be removed from this device. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
