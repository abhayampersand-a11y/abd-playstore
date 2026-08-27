'use client';

import Avatar from '@mui/material/Avatar';

import { initials } from '@/lib/format';

/**
 * Play Store icons are remote and occasionally 404 or get blocked. `Avatar`
 * falls back to its children when the image fails, so an app is always
 * identifiable rather than leaving a broken-image box in the table.
 */
export function AppIcon({
  src,
  title,
  size = 40,
  radius,
}: {
  src?: string;
  title: string;
  size?: number;
  radius?: number;
}) {
  return (
    <Avatar
      src={src}
      alt=""
      variant="rounded"
      sx={{
        width: size,
        height: size,
        borderRadius: `${radius ?? Math.round(size * 0.24)}px`,
        fontSize: size * 0.36,
        bgcolor: 'surface.sunken',
        color: 'text.secondary',
        flexShrink: 0,
      }}
    >
      {initials(title)}
    </Avatar>
  );
}
