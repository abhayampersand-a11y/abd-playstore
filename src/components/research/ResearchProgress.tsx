'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { RUNNER_STEPS, type RunnerState } from '@/lib/research/useResearchRunner';

/**
 * The run narration.
 *
 * A long opaque spinner is where users abandon a tool, so each step is named,
 * the completed ones stay visibly done, and the failing one is marked in place.
 * The user always knows which phase they are in and what it is doing.
 */
export function ResearchProgress({ state, keyword }: { state: RunnerState; keyword: string }) {
  const theme = useTheme();
  const total = RUNNER_STEPS.length;
  const completed = state.status === 'complete' ? total : Math.min(state.activeStep, total);
  const progress = (completed / total) * 100;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5" component="p">
          {state.status === 'complete'
            ? 'Research complete'
            : state.status === 'error'
              ? 'Research stopped'
              : `Researching “${keyword}”`}
        </Typography>
        {state.status === 'running' ? <CircularProgress size={16} thickness={5} /> : null}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {state.status === 'error'
          ? state.partial
            ? 'The Google Play data was collected and saved. Only the AI analysis failed.'
            : 'Nothing was saved. You can adjust the inputs and try again.'
          : 'Google Play is scraped and cleaned first, then the cleaned evidence goes to the AI.'}
      </Typography>

      <LinearProgress
        variant={state.status === 'running' && completed === 0 ? 'indeterminate' : 'determinate'}
        value={progress}
        color={state.status === 'error' ? 'error' : 'primary'}
        sx={{ mb: 3, height: 6 }}
        aria-label="Research progress"
      />

      <Stack spacing={0.5}>
        {RUNNER_STEPS.map((step, index) => {
          const isComplete = index < completed;
          const isActive = index === completed && state.status === 'running';
          const isFailed = index === completed && state.status === 'error';

          const color = isFailed
            ? theme.palette.error.main
            : isComplete
              ? theme.palette.success.main
              : isActive
                ? theme.palette.primary.main
                : theme.palette.text.disabled;

          return (
            <Stack
              key={step.id}
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                transition: 'background-color 200ms ease',
              }}
            >
              <Box sx={{ display: 'flex', mt: '1px', color, flexShrink: 0 }}>
                {isFailed ? (
                  <ErrorRoundedIcon sx={{ fontSize: 19 }} />
                ) : isComplete ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 19 }} />
                ) : isActive ? (
                  <CircularProgress size={17} thickness={5.5} />
                ) : (
                  <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 19 }} />
                )}
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isActive || isFailed ? 650 : 550,
                    color: isComplete || isActive || isFailed ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {index + 1}. {step.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {step.detail}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>

      {state.warnings.length > 0 ? (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, display: 'block', mb: 0.5 }}>
            Notes from the run
          </Typography>
          <Stack spacing={0.375}>
            {state.warnings.slice(0, 5).map((warning) => (
              <Typography key={warning} variant="caption" color="text.secondary">
                • {warning}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}
