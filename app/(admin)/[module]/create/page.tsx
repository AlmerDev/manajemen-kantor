export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import CrudForm from '@/components/CrudForm';
import { getModule } from '@/lib/modules';
import { getLookups } from '@/lib/data';


export default async function CreatePage({ params, searchParams }: { params: { module: string }; searchParams: { error?: string } }) {
  const config = getModule(params.module);
  if (!config || !config.hasCreate) notFound();
  const lookups = await getLookups();
  return <CrudForm config={config} lookups={lookups} mode="create" error={searchParams.error} />;
}
