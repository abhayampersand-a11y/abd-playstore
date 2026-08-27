import type { Metadata } from 'next';

import { NewResearchView } from '@/components/research/NewResearchView';

export const metadata: Metadata = {
  title: 'New Research',
  description: 'Research a new app idea against the Google Play Store.',
};

/**
 * The keyword arrives as a search param from "Re-run" links. Reading it on the
 * server keeps `useSearchParams` (and its Suspense requirement) out of the
 * client tree entirely.
 */
export default async function NewResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string }>;
}) {
  const { keyword } = await searchParams;
  return <NewResearchView initialKeyword={typeof keyword === 'string' ? keyword.slice(0, 80) : undefined} />;
}
