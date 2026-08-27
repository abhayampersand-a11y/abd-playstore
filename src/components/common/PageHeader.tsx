'use client';

import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import type { ReactNode } from 'react';

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  crumbs?: Crumb[];
  /** Rendered under the description - chips, meta rows, stage steppers. */
  meta?: ReactNode;
}

export function PageHeader({ title, description, action, crumbs, meta }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: 3 }}>
      {crumbs && crumbs.length > 0 ? (
        <Breadcrumbs sx={{ mb: 1, fontSize: '0.8125rem' }} aria-label="Breadcrumb">
          {crumbs.map((crumb, index) =>
            crumb.href && index < crumbs.length - 1 ? (
              <Link
                key={`${crumb.label}-${index}`}
                component={NextLink}
                href={crumb.href}
                underline="hover"
                color="text.secondary"
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography key={`${crumb.label}-${index}`} variant="body2" color="text.primary">
                {crumb.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      ) : null}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2" component="h1">
            {title}
          </Typography>
          {description ? (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Stack>

      {meta ? <Box sx={{ mt: 2 }}>{meta}</Box> : null}
    </Box>
  );
}
