'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { signOut } from '@/lib/api-client';
import { useResearchStore } from '@/lib/store/ResearchStore';
import { NAV_ITEMS, isNavItemActive } from './navigation';

export const SIDEBAR_WIDTH = 252;

interface SidebarProps {
  onNavigate?: () => void;
  /** Signed-in account, or null when this server has auth switched off. */
  username?: string | null;
}

export function Sidebar({ onNavigate, username }: SidebarProps) {
  const pathname = usePathname();
  const { items, stats } = useResearchStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // Land on /login either way: if the request failed the cookie may still
      // be live, and middleware will bounce a valid session straight back in.
      window.location.assign('/login');
    }
  };

  const counts: Record<string, number | undefined> = {
    '/history': items.length || undefined,
    '/saved': stats.savedOpportunities || undefined,
    '/opportunities': stats.analysedCount || undefined,
  };

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2.25 }}>
        <Stack
          component={NextLink}
          href="/"
          direction="row"
          spacing={1.25}
          alignItems="center"
          onClick={onNavigate}
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Box
            aria-hidden
            sx={(theme) => ({
              width: 32,
              height: 32,
              borderRadius: '10px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.8125rem',
              letterSpacing: '-0.02em',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            })}
          >
            AS
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              AppScout AI
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              Play Store intelligence
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ px: 2, pb: 1.5 }}>
        <Button
          component={NextLink}
          href="/research/new"
          onClick={onNavigate}
          variant="contained"
          fullWidth
          startIcon={<AddRoundedIcon />}
        >
          Research New Idea
        </Button>
      </Box>

      <Divider sx={{ mx: 2 }} />

      <List component="nav" sx={{ px: 1.25, py: 1.25, flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          const count = counts[item.href];

          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                component={NextLink}
                href={item.href}
                selected={active}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                sx={{ py: 0.875 }}
              >
                <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary' }}>
                  <Icon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: '0.875rem',
                        fontWeight: active ? 650 : 500,
                        color: active ? 'text.primary' : 'text.secondary',
                      },
                    },
                  }}
                />
                {count ? (
                  <Chip
                    label={count}
                    size="small"
                    sx={(theme) => ({
                      height: 20,
                      fontSize: '0.6875rem',
                      fontWeight: 650,
                      backgroundColor: alpha(theme.palette.text.primary, 0.07),
                      color: 'text.secondary',
                    })}
                  />
                ) : null}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      <Stack spacing={1.5} sx={{ px: 2.5, py: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
          {stats.totalResearches > 0
            ? `${stats.totalResearches} researches · ${stats.highOpportunityIdeas} strong`
            : 'No research yet — start with a keyword.'}
        </Typography>

        {username ? (
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              sx={(theme) => ({
                width: 28,
                height: 28,
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: alpha(theme.palette.primary.main, 0.16),
                color: 'primary.main',
              })}
            >
              {username.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
              {username}
            </Typography>
            <Tooltip title="Sign out">
              <span>
                <IconButton
                  size="small"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  aria-label="Sign out"
                >
                  <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
