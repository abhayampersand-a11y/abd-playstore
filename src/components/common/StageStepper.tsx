'use client';

import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import NextLink from 'next/link';

import { WORKSPACE_STAGES, stageHref, type WorkspaceStageId } from '@/lib/research/stages';

interface StageStepperProps {
  researchId: string;
  activeStage: WorkspaceStageId;
  unlocked: Set<WorkspaceStageId>;
}

/**
 * The research progression rail.
 *
 * It is navigation *and* status: completed stages are links, the current stage
 * is emphasised, and locked stages say what unlocks them rather than simply
 * refusing to respond. The user should never wonder where they are in the flow.
 */
export function StageStepper({ researchId, activeStage, unlocked }: StageStepperProps) {
  const theme = useTheme();
  const activeIndex = WORKSPACE_STAGES.findIndex((stage) => stage.id === activeStage);

  return (
    <Box
      component="nav"
      aria-label="Research progress"
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0.5,
        overflowX: 'auto',
        pb: 0.5,
        // The rail scrolls inside itself; the page never scrolls sideways.
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(theme.palette.text.primary, 0.16),
          borderRadius: 999,
        },
      }}
    >
      {WORKSPACE_STAGES.map((stage, index) => {
        const isUnlocked = unlocked.has(stage.id);
        const isActive = stage.id === activeStage;
        const isComplete = isUnlocked && index < activeIndex;

        const accent = isActive
          ? theme.palette.primary.main
          : isUnlocked
            ? theme.palette.text.secondary
            : theme.palette.text.disabled;

        const content = (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: 2,
              minWidth: 'max-content',
              border: '1px solid',
              borderColor: isActive ? alpha(theme.palette.primary.main, 0.35) : 'transparent',
              backgroundColor: isActive
                ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)
                : 'transparent',
              opacity: isUnlocked ? 1 : 0.55,
              transition: 'background-color 160ms ease, border-color 160ms ease',
              '&:hover': isUnlocked && !isActive ? { backgroundColor: theme.palette.surface.subtle } : undefined,
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: isComplete ? theme.palette.success.main : accent,
                border: `1.5px solid ${alpha(isComplete ? theme.palette.success.main : accent, 0.45)}`,
                backgroundColor: isComplete
                  ? alpha(theme.palette.success.main, 0.12)
                  : isActive
                    ? alpha(theme.palette.primary.main, 0.14)
                    : 'transparent',
              }}
            >
              {isComplete ? (
                <CheckRoundedIcon sx={{ fontSize: 14 }} />
              ) : !isUnlocked ? (
                <LockOutlinedIcon sx={{ fontSize: 12 }} />
              ) : (
                index + 1
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: isActive ? 650 : 550, color: isActive ? 'text.primary' : accent }}
            >
              {stage.shortLabel}
            </Typography>
          </Stack>
        );

        return (
          <Stack key={stage.id} direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
            {isUnlocked ? (
              <Tooltip title={stage.description} placement="bottom" arrow>
                <Box
                  component={NextLink}
                  href={stageHref(researchId, stage)}
                  aria-current={isActive ? 'page' : undefined}
                  sx={{ textDecoration: 'none', display: 'block' }}
                >
                  {content}
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title={`Locked — ${stage.description}`} placement="bottom" arrow>
                <Box sx={{ cursor: 'not-allowed' }}>{content}</Box>
              </Tooltip>
            )}

            {index < WORKSPACE_STAGES.length - 1 ? (
              <Box
                aria-hidden
                sx={{
                  width: 18,
                  height: 1.5,
                  mx: 0.25,
                  borderRadius: 999,
                  backgroundColor: alpha(theme.palette.text.primary, 0.14),
                  flexShrink: 0,
                }}
              />
            ) : null}
          </Stack>
        );
      })}
    </Box>
  );
}
