'use client';

import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { signIn } from '@/lib/api-client';
import { toAppError } from '@/lib/errors';
import { loginSchema, type LoginValues } from '@/lib/validation';

interface LoginViewProps {
  /** False when the server has no AUTH_USERNAME/AUTH_PASSWORD pair set. */
  configured: boolean;
}

export function LoginView({ configured }: LoginViewProps) {
  const searchParams = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    setFailure(null);
    try {
      await signIn(values);
      // A full navigation rather than router.push: the fresh cookie has to be
      // read by middleware and by the server layout on the way back in.
      window.location.assign(safeRedirect(searchParams.get('from')));
    } catch (caught) {
      setFailure(toAppError(caught).message);
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 6,
        backgroundColor: 'background.default',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Stack spacing={1.25} alignItems="center" sx={{ mb: 3 }}>
          <Box
            aria-hidden
            sx={(theme) => ({
              width: 48,
              height: 48,
              borderRadius: '14px',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            })}
          >
            AS
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            AppScout AI
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            This workspace is private. Sign in to continue.
          </Typography>
        </Stack>

        <Paper
          variant="outlined"
          sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, backgroundColor: 'background.paper' }}
        >
          {configured ? (
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2.25}>
                {failure ? <Alert severity="error">{failure}</Alert> : null}

                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Username"
                      fullWidth
                      autoFocus
                      autoComplete="username"
                      disabled={submitting}
                      error={Boolean(errors.username)}
                      helperText={errors.username?.message ?? ' '}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      autoComplete="current-password"
                      disabled={submitting}
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message ?? ' '}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword((visible) => !visible)}
                                edge="end"
                                size="small"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? (
                                  <VisibilityOffRoundedIcon sx={{ fontSize: 20 }} />
                                ) : (
                                  <VisibilityRoundedIcon sx={{ fontSize: 20 }} />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting}
                  startIcon={<LoginRoundedIcon />}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Alert severity="warning" icon={<LockRoundedIcon />}>
              <AlertTitle sx={{ fontWeight: 700 }}>Sign-in is not configured</AlertTitle>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Nobody can sign in until this server has an account. Add to <code>.env.local</code>:
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
                {CONFIG_SNIPPET}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Then restart the server. On a hosted deployment, set the same three variables in the hosting
                dashboard instead.
              </Typography>
            </Alert>
          )}
        </Paper>

        <Typography variant="caption" color="text.disabled" align="center" sx={{ display: 'block', mt: 2.5 }}>
          Credentials are read from the server environment — there is no sign-up.
        </Typography>
      </Box>
    </Box>
  );
}

const CONFIG_SNIPPET = [
  'AUTH_USERNAME=you',
  'AUTH_PASSWORD=a-long-passphrase',
  'AUTH_SECRET=a-random-32-character-string',
].join('\n');

/** Only ever follow a same-origin, absolute path back into the app. */
function safeRedirect(from: string | null): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return '/';
  return from;
}
