import type { Metadata } from 'next';

import { CompetitorDirectory } from '@/components/competitors/CompetitorDirectory';

export const metadata: Metadata = {
  title: 'Competitors',
  description: 'Every app seen across all of your research.',
};

export default function CompetitorsPage() {
  return <CompetitorDirectory />;
}
