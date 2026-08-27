'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  /** Remove the body padding - used when the child is a table or a chart. */
  disablePadding?: boolean;
  dense?: boolean;
}

/**
 * The single card primitive the whole app composes from. Having one keeps
 * header rhythm, divider weight and padding identical everywhere, which is most
 * of what separates a considered dashboard from a bag of MUI components.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  icon,
  children,
  disablePadding = false,
  dense = false,
}: SectionCardProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {hasHeader ? (
        <>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
            sx={{ px: dense ? 2 : 2.5, py: dense ? 1.5 : 2 }}
          >
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
              {icon ? (
                <Box sx={{ color: 'text.secondary', display: 'flex', mt: '2px', flexShrink: 0 }}>{icon}</Box>
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                {title ? (
                  <Typography variant="h5" component="h2" sx={{ lineHeight: 1.35 }}>
                    {title}
                  </Typography>
                ) : null}
                {subtitle ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {subtitle}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
            {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
          </Stack>
          <Divider />
        </>
      ) : null}
      <Box sx={{ flex: 1, p: disablePadding ? 0 : dense ? 2 : 2.5, minWidth: 0 }}>{children}</Box>
    </Card>
  );
}
