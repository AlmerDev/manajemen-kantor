export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { notFound } from 'next/navigation';
import CrudForm from '@/components/CrudForm';
import { getModule } from '@/lib/modules';
import { getLookups, getRow } from '@/lib/data';

export default async function EditPage({ params, searchParams }: { params: { module: string; id: string }; searchParams: { error?: string } }) {
  const config = getModule(params.module);
  if (!config || !config.canEdit) notFound();
  const [row, lookups] = await Promise.all([getRow(config.table, params.id), getLookups()]);
  if (!row) notFound();
  return <CrudForm config={config} row={row} lookups={lookups} mode="update" error={searchParams.error} />;
}
