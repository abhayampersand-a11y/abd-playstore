'use client';

import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';

import { CopyButton } from '@/components/common/CopyButton';
import { Markdown } from '@/components/common/Markdown';
import { SectionCard } from '@/components/common/SectionCard';
import { ErrorState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { runDevPrompt } from '@/lib/api-client';
import { toAppError, type AppError } from '@/lib/errors';
import { GenerateGate } from './GenerateGate';
import { useResearchWorkspace } from './ResearchWorkspaceProvider';

/**
 * Stage 6 - the handoff.
 *
 * The output is the deliverable, so the page is built around getting it out:
 * rendered for reading, raw for copying, and a download for keeping.
 */
export function DevPromptStage() {
  const { record, update } = useResearchWorkspace();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [tab, setTab] = useState(0);

  const generate = useCallback(async () => {
    if (!record?.analysis || !record.buildPlan) return;
    setLoading(true);
    setError(null);
    try {
      const { prompt, usage } = await runDevPrompt({
        input: record.input,
        analysis: record.analysis,
        plan: record.buildPlan,
      });
      await update({
        devPrompt: prompt,
        stage: 'devPrompt',
        usage: {
          inputTokens: record.usage.inputTokens + usage.inputTokens,
          outputTokens: record.usage.outputTokens + usage.outputTokens,
          calls: record.usage.calls + usage.calls,
        },
      });
      toast.success('Development prompt ready');
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError);
      toast.error(appError.message, 'Could not generate the prompt');
    } finally {
      setLoading(false);
    }
  }, [record, update, toast]);

  const download = useCallback(() => {
    if (!record?.devPrompt) return;
    const name = (record.buildPlan?.appName ?? record.input.keyword)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const blob = new Blob([record.devPrompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${name || 'appscout'}-build-prompt.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [record]);

  const wordCount = useMemo(
    () => (record?.devPrompt ? record.devPrompt.trim().split(/\s+/).length : 0),
    [record?.devPrompt],
  );

  if (!record) return null;

  if (!record.analysis || !record.buildPlan) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="p" sx={{ mb: 1 }}>
          Finish the build plan first
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The development prompt is generated from the build plan, so that stage has to come first.
        </Typography>
      </Card>
    );
  }

  if (!record.devPrompt) {
    return (
      <GenerateGate
        title="Generate the development prompt"
        description={`A single, self-contained engineering brief an AI coding assistant can build ${record.buildPlan.appName} from — no follow-up questions needed.`}
        bullets={[
          'Exact screens, routes, components and navigation',
          'Database schema, API endpoints and validation rules',
          'State management, error handling, notifications and payments',
          'Security, testing, deployment and environment variables',
        ]}
        buttonLabel="Generate prompt"
        runningLabel="Writing the prompt…"
        estimate="Usually 40-90 seconds"
        icon={<CodeRoundedIcon />}
        loading={loading}
        error={error}
        onGenerate={() => void generate()}
      />
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        {error ? <ErrorState error={error} onRetry={() => void generate()} /> : null}

        <SectionCard
          title="Development prompt"
          subtitle={`${wordCount.toLocaleString('en')} words · paste into Claude Code, Cursor or any AI coding assistant`}
          icon={<TerminalRoundedIcon sx={{ fontSize: 19 }} />}
          action={
            <Stack direction="row" spacing={1}>
              <CopyButton
                value={record.devPrompt}
                label="Copy Prompt"
                copiedLabel="Copied"
                toastMessage="Prompt copied to clipboard"
                variant="contained"
              />
              <Button variant="outlined" onClick={download} startIcon={<DownloadRoundedIcon />}>
                Download
              </Button>
              <Button
                variant="outlined"
                onClick={() => void generate()}
                disabled={loading}
                startIcon={<RefreshRoundedIcon />}
              >
                {loading ? 'Regenerating…' : 'Regenerate'}
              </Button>
            </Stack>
          }
          disablePadding
        >
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
            <Tabs value={tab} onChange={(_, next: number) => setTab(next)}>
              <Tab label="Rendered" />
              <Tab label="Raw markdown" />
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {tab === 0 ? (
              <Markdown content={record.devPrompt} />
            ) : (
              <Box
                component="pre"
                sx={(theme) => ({
                  m: 0,
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: theme.palette.surface.subtle,
                  overflowX: 'auto',
                  maxHeight: 640,
                  overflowY: 'auto',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                })}
              >
                {record.devPrompt}
              </Box>
            )}
          </Box>
        </SectionCard>

        <Card sx={{ p: 2.5, backgroundColor: 'surface.subtle' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            How to use this
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            Copy the prompt, open a fresh project directory, and paste it as the first message to your coding
            assistant. It is written to be self-contained — the assistant does not need the research, the competitor
            data or this app to work from it. Expect to review the schema and the payment integration by hand before
            shipping; everything else should come out buildable.
          </Typography>
        </Card>
      </Stack>
    </Box>
  );
}
