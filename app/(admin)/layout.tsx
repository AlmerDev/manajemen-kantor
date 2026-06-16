export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { headers } from 'next/headers';
import AdminShell from '@/components/AdminShell';
import { requireUser } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { getOfficeSettings } from '@/lib/office';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const path = headers().get('x-pathname') || '';
  const [{ count: pendingCuti }, { count: pendingKasbon }, officeSettings] = await Promise.all([
    supabaseAdmin.from('cuti').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('kasbon').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    getOfficeSettings()
  ]);
  return <AdminShell user={user} currentPath={path} officeSettings={officeSettings} pendingCuti={pendingCuti || 0} pendingKasbon={pendingKasbon || 0}>{children}</AdminShell>;
}
