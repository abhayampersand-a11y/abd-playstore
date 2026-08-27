import type { Metadata } from 'next';

import { SavedIdeasView } from '@/components/saved/SavedIdeasView';

export const metadata: Metadata = {
  title: 'Saved Ideas',
  description: 'Ideas you have bookmarked.',
};

export default function SavedPage() {
  return <SavedIdeasView />;
}
