import type { Metadata } from 'next';

import { DashboardView } from '@/components/dashboard/DashboardView';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your app opportunity research at a glance.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
