import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/common/ToastProvider';
import { getCurrentSession } from '@/lib/auth/server';
import { ResearchStoreProvider } from '@/lib/store/ResearchStore';
import { isDatabaseConfigured } from '@/lib/store/serverStore';
import { ThemeRegistry } from '@/theme/ThemeRegistry';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'AppScout AI — Google Play opportunity research',
    template: '%s · AppScout AI',
  },
  description:
    'Find mobile app opportunities with real demand, manageable competition and clear user pain — by mining Google Play competitors and reviews with AI.',
  applicationName: 'AppScout AI',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0c0e' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Named here so the sidebar can show who is signed in; the actual gate is
  // src/middleware.ts, which never lets an unauthenticated request this far.
  const session = await getCurrentSession();

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeRegistry>
          <ToastProvider>
            <ResearchStoreProvider persistent={isDatabaseConfigured()}>
              <AppShell username={session?.username ?? null}>{children}</AppShell>
            </ResearchStoreProvider>
          </ToastProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
