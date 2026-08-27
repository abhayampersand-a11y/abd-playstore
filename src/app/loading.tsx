import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/** Route-level skeleton. Mirrors the common page shape: header, stats, panel. */
export default function Loading() {
  return (
    <Box>
      <Skeleton variant="text" width={240} height={44} />
      <Skeleton variant="text" width={420} height={22} sx={{ mb: 3 }} />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          mb: 3,
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={124} />
        ))}
      </Box>

      <Stack spacing={2}>
        <Skeleton variant="rounded" height={280} />
        <Skeleton variant="rounded" height={200} />
      </Stack>
    </Box>
  );
}
