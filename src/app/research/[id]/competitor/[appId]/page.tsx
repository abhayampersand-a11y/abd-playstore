import { CompetitorDetail } from '@/components/competitors/CompetitorDetail';

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ id: string; appId: string }>;
}) {
  const { appId } = await params;
  return <CompetitorDetail appId={decodeURIComponent(appId)} />;
}
