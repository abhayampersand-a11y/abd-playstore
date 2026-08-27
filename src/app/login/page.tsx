import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoginView } from '@/components/auth/LoginView';
import { isAuthConfigured } from '@/lib/auth/credentials';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

// The configured-account check reads the environment at request time.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    // useSearchParams inside LoginView needs a Suspense boundary above it.
    <Suspense fallback={null}>
      <LoginView configured={isAuthConfigured()} />
    </Suspense>
  );
}
