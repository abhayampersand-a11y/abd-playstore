import { createTheme, alpha, type Theme } from '@mui/material/styles';

/**
 * AppScout AI theme.
 *
 * Two ideas drive it: generous whitespace with hairline borders instead of
 * heavy shadows, and a single accent colour used sparingly so that the charts -
 * which carry the actual information - are the most saturated thing on screen.
 */

declare module '@mui/material/styles' {
  interface Palette {
    surface: { subtle: string; raised: string; sunken: string };
  }
  interface PaletteOptions {
    surface?: { subtle: string; raised: string; sunken: string };
  }
}

const FONT_STACK = [
  'var(--font-inter)',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'Roboto',
  'Helvetica',
  'Arial',
  'sans-serif',
].join(', ');

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark';

  const base = createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#8b8cf7' : '#4f46e5',
        light: isDark ? '#a5a6fa' : '#6d67ea',
        dark: isDark ? '#6d6ef0' : '#4338ca',
        contrastText: isDark ? '#12121a' : '#ffffff',
      },
      secondary: {
        main: isDark ? '#38bdf8' : '#0284c7',
      },
      success: { main: '#0ca30c' },
      warning: { main: isDark ? '#fab219' : '#c77e07' },
      error: { main: '#d03b3b' },
      info: { main: isDark ? '#3987e5' : '#2a78d6' },
      background: {
        default: isDark ? '#0b0c0e' : '#f6f7f9',
        paper: isDark ? '#16171a' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f4f4f5' : '#0f1115',
        secondary: isDark ? '#a1a1aa' : '#5b6070',
      },
      divider: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,17,21,0.09)',
      surface: {
        subtle: isDark ? '#1c1d21' : '#fafbfc',
        raised: isDark ? '#212226' : '#ffffff',
        sunken: isDark ? '#000000' : '#eef0f4',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_STACK,
      h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 },
      h2: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.022em', lineHeight: 1.2 },
      h3: { fontSize: '1.375rem', fontWeight: 650, letterSpacing: '-0.018em', lineHeight: 1.25 },
      h4: { fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.014em', lineHeight: 1.3 },
      h5: { fontSize: '1rem', fontWeight: 650, letterSpacing: '-0.01em' },
      h6: { fontSize: '0.9375rem', fontWeight: 650 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 550 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.01em' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.65 },
      body2: { fontSize: '0.8438rem', lineHeight: 1.6 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5 },
      button: { fontWeight: 600, letterSpacing: 0, textTransform: 'none' },
      overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.09em', lineHeight: 1.6 },
    },
  });

  const hairline = base.palette.divider;

  return createTheme(base, {
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': { boxSizing: 'border-box' },
          html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
          body: { backgroundColor: base.palette.background.default },
          '::selection': {
            backgroundColor: alpha(base.palette.primary.main, 0.24),
          },
          // Recharts injects focus outlines on hover targets; suppress them but
          // keep keyboard focus visible.
          '.recharts-wrapper:focus, .recharts-surface:focus': { outline: 'none' },
          '.recharts-wrapper:focus-visible': {
            outline: `2px solid ${base.palette.primary.main}`,
            outlineOffset: 2,
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: hairline },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0, variant: 'outlined' },
        styleOverrides: {
          root: {
            borderRadius: 14,
            borderColor: hairline,
            backgroundColor: base.palette.background.paper,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16, paddingBlock: 8 },
          sizeLarge: { paddingInline: 22, paddingBlock: 11, fontSize: '0.9375rem' },
          outlined: { borderColor: hairline },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 7, fontWeight: 550 },
          sizeSmall: { height: 22, fontSize: '0.75rem' },
          outlined: { borderColor: hairline },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 10, backgroundColor: base.palette.surface.subtle },
          notchedOutline: { borderColor: hairline },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: hairline, paddingBlock: 12 },
          head: {
            fontWeight: 650,
            fontSize: '0.75rem',
            letterSpacing: '0.055em',
            textTransform: 'uppercase',
            color: base.palette.text.secondary,
            backgroundColor: base.palette.surface.subtle,
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:last-child td': { borderBottom: 0 } },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44 },
          indicator: { height: 2, borderRadius: 2 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { minHeight: 44, textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#2a2b30' : '#1c1e24',
            fontSize: '0.75rem',
            borderRadius: 8,
            paddingInline: 10,
            paddingBlock: 6,
          },
          arrow: { color: isDark ? '#2a2b30' : '#1c1e24' },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, height: 6, backgroundColor: base.palette.surface.sunken },
          bar: { borderRadius: 999 },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 10, alignItems: 'flex-start' } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 16, border: `1px solid ${hairline}` } },
      },
      MuiDrawer: {
        styleOverrides: { paper: { backgroundImage: 'none', borderColor: hairline } },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 9,
            '&.Mui-selected': {
              backgroundColor: alpha(base.palette.primary.main, isDark ? 0.18 : 0.1),
              '&:hover': { backgroundColor: alpha(base.palette.primary.main, isDark ? 0.24 : 0.14) },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 34, color: 'inherit' } },
      },
      MuiAvatar: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  });
}
