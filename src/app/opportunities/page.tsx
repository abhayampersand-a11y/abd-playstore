import type { Metadata } from 'next';

import { OpportunitiesView } from '@/components/opportunities/OpportunitiesView';

export const metadata: Metadata = {
  title: 'AI Opportunities',
  description: 'Every scored opportunity, ranked.',
};

export default function OpportunitiesPage() {
  return <OpportunitiesView />;
}
