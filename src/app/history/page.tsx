import type { Metadata } from 'next';

import { HistoryView } from '@/components/history/HistoryView';

export const metadata: Metadata = {
  title: 'Research History',
  description: 'Every market you have researched.',
};

export default function HistoryPage() {
  return <HistoryView />;
}
