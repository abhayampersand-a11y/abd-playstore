'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createAppTheme } from './theme';

type ColorMode = 'light' | 'dark';

interface ColorModeContextValue {
  mode: ColorMode;
  toggle: () => void;
  setMode: (mode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggle: () => {},
  setMode: () => {},
});

export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}

const STORAGE_KEY = 'appscout.color-mode';

export function ThemeRegistry({ children }: { children: ReactNode }) {
  // Always render light on the server, then reconcile on mount. Reading
  // localStorage during render would produce a hydration mismatch.
  const [mode, setModeState] = useState<ColorMode>('light');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        setModeState(stored);
        return;
      }
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        setModeState('dark');
      }
    } catch {
      // Private browsing or blocked storage - the light default is fine.
    }
  }, []);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore - the choice simply will not persist.
    }
  }, []);

  const toggle = useCallback(() => {
    setModeState((current) => {
      const next: ColorMode = current === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore.
      }
      return next;
    });
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const contextValue = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle, setMode]);

  return (
    <AppRouterCacheProvider options={{ key: 'mui', enableCssLayer: true }}>
      <ColorModeContext.Provider value={contextValue}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
