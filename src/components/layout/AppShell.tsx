'use client';

import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { useResearchStore } from '@/lib/store/ResearchStore';
import { useColorMode } from '@/theme/ThemeRegistry';
import { NAV_ITEMS, isNavItemActive } from './navigation';
import { SIDEBAR_WIDTH, Sidebar } from './Sidebar';

/**
 * Desktop-first shell: a permanent rail above the `lg` breakpoint, a temporary
 * drawer below it. The mobile top bar exists only to carry the menu button and
 * the current section name, so vertical space goes to content.
 */
export function AppShell({ children, username }: { children: ReactNode; username?: string | null }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const pathname = usePathname();
  const { mode, toggle } = useColorMode();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // The sign-in screen is deliberately chrome-free: no nav to somewhere you
  // cannot go yet. Declared after the hooks so the hook order stays stable.
  if (pathname === '/login') return <>{children}</>;

  const activeItem = NAV_ITEMS.find((item) => isNavItemActive(item, pathname));

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', backgroundColor: 'background.default' }}>
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            position: 'fixed',
            insetBlock: 0,
            left: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            zIndex: theme.zIndex.drawer,
          }}
        >
          <Sidebar username={username} />
        </Box>
      ) : (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH } } }}
        >
          <Sidebar username={username} onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <Box
        component="div"
        sx={{
          flex: 1,
          minWidth: 0,
          ml: isDesktop ? `${SIDEBAR_WIDTH}px` : 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          color="transparent"
          sx={{
            backdropFilter: 'blur(12px)',
            backgroundColor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(11,12,14,0.78)' : 'rgba(246,247,249,0.82)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: { xs: 56, lg: 60 } }}>
            {!isDesktop ? (
              <IconButton edge="start" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
                <MenuRoundedIcon />
              </IconButton>
            ) : null}

            <Typography variant="subtitle1" sx={{ fontWeight: 650, flex: 1, minWidth: 0 }} noWrap>
              {activeItem?.label ?? 'Research'}
            </Typography>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <IconButton onClick={toggle} aria-label="Toggle colour mode" size="small">
                  {mode === 'dark' ? (
                    <LightModeRoundedIcon sx={{ fontSize: 20 }} />
                  ) : (
                    <DarkModeRoundedIcon sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, py: { xs: 3, md: 4 } }}>
          <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 4 } }}>
            <StorageBanner />
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Shown on every page when the store cannot be read - almost always an
 * unreachable database. Without it the app renders as merely empty, which reads
 * as "you have no research" rather than "the server could not answer".
 */
function StorageBanner() {
  const { storageError, refresh } = useResearchStore();
  if (!storageError) return null;

  return (
    <Alert
      severity="error"
      sx={{ mb: 3 }}
      action={
        <Button color="inherit" size="small" onClick={() => void refresh()}>
          Retry
        </Button>
      }
    >
      <AlertTitle sx={{ fontWeight: 700 }}>Your research could not be loaded</AlertTitle>
      {storageError.message}
      {storageError.hint ? ` ${storageError.hint}` : null}
    </Alert>
  );
}
