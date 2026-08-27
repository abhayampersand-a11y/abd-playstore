import type { ReactNode } from 'react';

import { ResearchWorkspaceProvider } from '@/components/research/ResearchWorkspaceProvider';
import { WorkspaceChrome } from '@/components/research/WorkspaceChrome';

/**
 * The workspace shell. Loading the record once here means the six stage pages
 * share a single read and a single "not found" path.
 */
export default async function ResearchLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ResearchWorkspaceProvider researchId={id}>
      <WorkspaceChrome>{children}</WorkspaceChrome>
    </ResearchWorkspaceProvider>
  );
}
