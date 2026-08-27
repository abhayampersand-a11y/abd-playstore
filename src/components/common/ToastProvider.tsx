'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Snackbar from '@mui/material/Snackbar';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  key: number;
  severity: ToastSeverity;
  title?: string;
  message: string;
  duration: number;
}

interface ToastContextValue {
  notify: (toast: { severity?: ToastSeverity; title?: string; message: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>');
  return value;
}

/**
 * A single-slot toast queue. Errors linger long enough to read a hint; success
 * messages get out of the way quickly.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const current = queue[0];

  const notify = useCallback<ToastContextValue['notify']>(({ severity = 'info', title, message, duration }) => {
    setQueue((existing) => [
      ...existing,
      {
        key: Date.now() + Math.random(),
        severity,
        title,
        message,
        duration: duration ?? (severity === 'error' ? 8000 : 4000),
      },
    ]);
  }, []);

  const dismiss = useCallback((reason?: string) => {
    if (reason === 'clickaway') return;
    setQueue((existing) => existing.slice(1));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message, title) => notify({ severity: 'success', message, title }),
      error: (message, title) => notify({ severity: 'error', message, title }),
      info: (message, title) => notify({ severity: 'info', message, title }),
      warning: (message, title) => notify({ severity: 'warning', message, title }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={current?.key}
        open={Boolean(current)}
        autoHideDuration={current?.duration}
        onClose={(_, reason) => dismiss(reason)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {current ? (
          <Alert
            severity={current.severity}
            variant="filled"
            onClose={() => dismiss()}
            sx={{ maxWidth: 440, boxShadow: 6 }}
          >
            {current.title ? <AlertTitle sx={{ fontWeight: 700 }}>{current.title}</AlertTitle> : null}
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}
