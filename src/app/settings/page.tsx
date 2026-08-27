import type { Metadata } from 'next';

import { SettingsView } from '@/components/settings/SettingsView';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'API configuration, limits and local data.',
};

export default function SettingsPage() {
  return <SettingsView />;
}
