'use client';

import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import Button, { type ButtonProps } from '@mui/material/Button';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from './ToastProvider';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  value: string;
  label?: string;
  copiedLabel?: string;
  /** Message shown in the toast on success. Omit to skip the toast. */
  toastMessage?: string;
}

/**
 * Clipboard write with a real fallback: `navigator.clipboard` is unavailable on
 * insecure origins, which includes plenty of LAN dev setups, so a failed write
 * has to say something useful rather than silently doing nothing.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  toastMessage,
  ...buttonProps
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useToast();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const succeeded = await writeToClipboard(value);

    if (!succeeded) {
      toast.error(
        'Your browser blocked clipboard access. Select the text and copy it manually.',
        'Could not copy',
      );
      return;
    }

    setCopied(true);
    if (toastMessage) toast.success(toastMessage);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [value, toast, toastMessage]);

  return (
    <Button
      variant="outlined"
      startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
      onClick={() => void copy()}
      color={copied ? 'success' : 'primary'}
      {...buttonProps}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

async function writeToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    return succeeded;
  } catch {
    return false;
  }
}
