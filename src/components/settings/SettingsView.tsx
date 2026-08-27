'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ErrorState, TextBlockSkeleton } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { fetchHealth } from '@/lib/api-client';
import { toAppError, type AppError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useResearchStore } from '@/lib/store/ResearchStore';
import { useColorMode } from '@/theme/ThemeRegistry';
import type { HealthResponse } from '@/lib/types';

export function SettingsView() {
  const toast = useToast();
  const { mode, setMode } = useColorMode();
  const { items, stats, clearAll, storageAvailable } = useResearchStore();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHealth(await fetchHealth());
    } catch (caught) {
      setError(toAppError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClear = async () => {
    setConfirmClear(false);
    try {
      await clearAll();
      toast.success('All local research deleted');
    } catch {
      toast.error('Could not clear local data.');
    }
  };

  return (
    <Box sx={{ maxWidth: 880 }}>
      <PageHeader
        title="Settings"
        description="How AppScout is configured on this machine."
        crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }]}
      />

      <Stack spacing={2.5}>
        <SectionCard
          title="AI provider"
          subtitle="Configured server-side only — the key is never sent to the browser"
          icon={<KeyRoundedIcon sx={{ fontSize: 19 }} />}
          action={
            <Button size="small" onClick={() => void load()} startIcon={<RefreshRoundedIcon />} disabled={loading}>
              Re-check
            </Button>
          }
        >
          {loading ? (
            <TextBlockSkeleton lines={4} />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void load()} compact />
          ) : health ? (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {health.aiConfigured ? (
                  <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 22 }} />
                ) : (
                  <ErrorRoundedIcon sx={{ color: 'error.main', fontSize: 22 }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {health.providerLabel}
                    </Typography>
                    <Chip
                      label={health.providerIsPaid ? 'Paid per token' : 'Free tier'}
                      size="small"
                      color={health.providerIsPaid ? 'warning' : 'success'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 650 }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {health.aiConfigured
                      ? 'AI analysis, build plans and development prompts are available.'
                      : 'Scraping still works. AI stages will fail until a key is set.'}
                  </Typography>
                </Box>
              </Stack>

              {!health.aiConfigured ? (
                <Alert severity="info">
                  <AlertTitle sx={{ fontWeight: 700 }}>Add your key</AlertTitle>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {health.provider === 'gemini' ? (
                      <>
                        Get a free key at <code>aistudio.google.com/apikey</code> — no card needed — then put it in{' '}
                        <code>.env.local</code>:
                      </>
                    ) : (
                      <>
                        Create <code>.env.local</code> in the project root with:
                      </>
                    )}
                  </Typography>
                  <Box
                    component="pre"
                    sx={(theme) => ({
                      m: 0,
                      p: 1.5,
                      borderRadius: 2,
                      fontSize: '0.8125rem',
                      fontFamily: 'ui-monospace, monospace',
                      backgroundColor: theme.palette.surface.sunken,
                      overflowX: 'auto',
                    })}
                  >
                    {health.provider === 'gemini' ? 'GEMINI_API_KEY=your-key-here' : 'CLAUDE_API_KEY=sk-ant-...'}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Then restart the server. Never prefix it with NEXT_PUBLIC_ — that would ship the key to every
                    visitor&apos;s browser.
                  </Typography>
                </Alert>
              ) : null}

              <Divider />

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                <ConfigRow label="Model" value={health.model} />
                <ConfigRow label="Reasoning effort" value={health.effort} />
                <ConfigRow label="Max competitors per run" value={String(health.maxCompetitorDetail)} />
                <ConfigRow label="Max reviews per app" value={String(health.maxReviewsPerApp)} />
              </Box>

              <Typography variant="caption" color="text.disabled">
                Checked {formatDateTime(health.checkedAt)}. Switch provider with AI_PROVIDER, and override the rest
                with GEMINI_MODEL, AI_EFFORT, MAX_COMPETITOR_DETAIL and MAX_REVIEWS_PER_APP in{' '}
                <code>.env.local</code>.
              </Typography>
            </Stack>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Access"
          subtitle="Who can sign in to this deployment"
          icon={<LockRoundedIcon sx={{ fontSize: 19 }} />}
        >
          {loading ? (
            <TextBlockSkeleton lines={3} />
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {health?.authConfigured ? (
                  <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 22 }} />
                ) : (
                  <ErrorRoundedIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                )}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {health?.authConfigured ? 'Sign-in required' : 'No account configured'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {health?.authConfigured
                      ? 'One account, defined by AUTH_USERNAME and AUTH_PASSWORD. There is no sign-up.'
                      : 'Development runs open. A production deployment stays locked until credentials are set.'}
                  </Typography>
                </Box>
              </Stack>

              {!health?.authConfigured ? (
                <Alert severity="warning">
                  <AlertTitle sx={{ fontWeight: 700 }}>Lock this down before deploying</AlertTitle>
                  <Box
                    component="pre"
                    sx={(theme) => ({
                      m: 0,
                      p: 1.5,
                      borderRadius: 2,
                      fontSize: '0.8125rem',
                      fontFamily: 'ui-monospace, monospace',
                      backgroundColor: theme.palette.surface.sunken,
                      overflowX: 'auto',
                    })}
                  >
                    {'AUTH_USERNAME=you\nAUTH_PASSWORD=a-long-passphrase\nAUTH_SECRET=a-random-32-character-string'}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Changing AUTH_PASSWORD signs out every existing browser session.
                  </Typography>
                </Alert>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                  Sessions last 7 days and are held in a signed, HTTP-only cookie — never in localStorage, so no
                  script on the page can read one. Changing AUTH_PASSWORD signs out every existing session.
                </Typography>
              )}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title="Data storage"
          subtitle="Where your research lives"
          icon={<StorageRoundedIcon sx={{ fontSize: 19 }} />}
        >
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                label={health?.databaseConfigured ? 'PostgreSQL configured' : 'Browser storage'}
                size="small"
                color={health?.databaseConfigured ? 'success' : 'default'}
                variant="outlined"
              />
              {!storageAvailable ? <Chip label="Storage blocked" size="small" color="warning" variant="outlined" /> : null}
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
              {health?.databaseConfigured
                ? 'Research is stored in Postgres, scoped to your account, so it follows you to every device you sign in from. Nothing depends on this browser.'
                : 'Research is stored in this browser, so it will not follow you to another device or a private window, and the oldest unsaved runs are evicted when the quota fills. Set DATABASE_URL to a Neon connection string and restart - whatever is already here is copied up on first load.'}
            </Typography>

            <Divider />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {items.length} stored {items.length === 1 ? 'research' : 'researches'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.savedOpportunities} saved · {stats.analysedCount} analysed
                </Typography>
              </Box>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteForeverRoundedIcon />}
                onClick={() => setConfirmClear(true)}
                disabled={items.length === 0}
              >
                Delete all local data
              </Button>
            </Stack>
          </Stack>
        </SectionCard>

        <SectionCard title="Appearance" icon={<DarkModeRoundedIcon sx={{ fontSize: 19 }} />}>
          <FormControlLabel
            control={
              <Switch checked={mode === 'dark'} onChange={(event) => setMode(event.target.checked ? 'dark' : 'light')} />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 550 }}>
                  Dark mode
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Charts use a separate palette stepped for the dark surface, not an inverted one.
                </Typography>
              </Box>
            }
          />
        </SectionCard>

        <SectionCard title="Coming next" subtitle="Already scaffolded in the codebase">
          <Box
            component="ul"
            sx={{ m: 0, pl: 2.5, columnCount: { xs: 1, sm: 2 }, columnGap: 4, '& li': { mb: 0.75 } }}
          >
            {[
              'Server-side research history on Neon',
              'Team workspaces and sharing',
              'Credits and subscription billing',
              'Scheduled competitor monitoring',
              'Emailed market reports',
              'AI-generated Play Store listings',
              'ASO keyword research',
            ].map((feature) => (
              <Typography component="li" key={feature} variant="body2" color="text.secondary">
                {feature}
              </Typography>
            ))}
          </Box>
        </SectionCard>
      </Stack>

      <ConfirmDialog
        open={confirmClear}
        title="Delete all local data?"
        description={`All ${items.length} researches, including saved ideas, will be permanently removed from this browser. This cannot be undone.`}
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void handleClear()}
      />
    </Box>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </Typography>
    </Box>
  );
}
