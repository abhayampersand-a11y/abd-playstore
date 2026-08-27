'use client';

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { useResearchRunner } from '@/lib/research/useResearchRunner';
import type { ResearchInputValues } from '@/lib/validation';
import { ResearchForm } from './ResearchForm';
import { ResearchProgress } from './ResearchProgress';

export function NewResearchView({ initialKeyword }: { initialKeyword?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { state, start, reset } = useResearchRunner();
  const [keyword, setKeyword] = useState(initialKeyword ?? '');
  const [lastInput, setLastInput] = useState<ResearchInputValues | null>(null);

  const handleSubmit = useCallback(
    async (values: ResearchInputValues) => {
      setKeyword(values.keyword);
      setLastInput(values);

      const id = await start(values);
      if (id) {
        // A partial run still has competitor and review data worth showing, so
        // navigate either way and let the workspace surface what is missing.
        toast.success(`Research complete for “${values.keyword}”`);
        router.push(`/research/${id}`);
      }
    },
    [start, router, toast],
  );

  const retry = useCallback(() => {
    if (lastInput) void handleSubmit(lastInput);
  }, [lastInput, handleSubmit]);

  const isRunning = state.status === 'running';
  const showProgress = state.status !== 'idle';

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      <PageHeader
        title="New Research"
        description="AppScout searches Google Play, reads the competition, mines what users actually complain about, and asks the AI whether there is a real opportunity here."
        crumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'New Research' },
        ]}
      />

      {showProgress ? (
        <Stack spacing={2.5}>
          <Card sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <ResearchProgress state={state} keyword={keyword} />
          </Card>

          {state.status === 'error' ? (
            <>
              <ErrorState error={state.error} onRetry={retry} retryLabel="Run it again" />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                {state.partial && state.researchId ? (
                  <Button
                    component={NextLink}
                    href={`/research/${state.researchId}`}
                    variant="contained"
                    endIcon={<ArrowForwardRoundedIcon />}
                  >
                    Open what was collected
                  </Button>
                ) : null}
                <Button onClick={reset} variant="outlined">
                  Change the inputs
                </Button>
              </Stack>
            </>
          ) : null}
        </Stack>
      ) : (
        <ResearchForm
          onSubmit={(values) => void handleSubmit(values)}
          submitting={isRunning}
          defaultValues={initialKeyword ? { keyword: initialKeyword } : undefined}
        />
      )}

      {!showProgress ? (
        <Card sx={{ mt: 3, p: 2.5, backgroundColor: 'surface.subtle' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            What happens when you press start
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Google Play is searched for your keyword, duplicates and clones are removed, and full listings are pulled
            for the strongest competitors. Their newest reviews are collected, stripped of spam, and mined for
            complaint, praise and feature-request themes. Only that cleaned evidence — a few thousand tokens, never
            the raw reviews — is sent to the AI, which scores the market and gives you a verdict.
          </Typography>
        </Card>
      ) : null}
    </Box>
  );
}
