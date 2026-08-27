import ExploreOffRoundedIcon from '@mui/icons-material/ExploreOffRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

export default function NotFound() {
  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', py: 6 }}>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <Box
            aria-hidden
            sx={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              color: 'text.secondary',
              backgroundColor: 'surface.subtle',
            }}
          >
            <ExploreOffRoundedIcon />
          </Box>

          <Typography variant="h3" component="h1">
            Page not found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            That page does not exist. If you followed a link to a research, it may have been deleted from this
            browser.
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
            <Button component={NextLink} href="/" variant="contained">
              Back to dashboard
            </Button>
            <Button component={NextLink} href="/research/new" variant="outlined">
              Start new research
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}
