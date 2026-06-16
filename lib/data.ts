import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseAdmin } from './supabase';
import { getModule, ModuleConfig, relatedTables } from './modules';
import { monthYearNow } from './format';

export async function listRows(table: string) {
  noStore();
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    // Urutan dibuat stabil berdasarkan ID agar data yang baru diedit tidak loncat posisi.
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getRow(table: string, id: string | number) {
  noStore();
  const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

export async function getLookups() {
  noStore();
  const out: Record<string, any[]> = {};
  for (const table of relatedTables) {
    const { data } = await supabaseAdmin.from(table).select('*').order('id', { ascending: true });
    out[table] = data || [];
  }
  return out;
}

export function relationLabel(value: any, relation: any, lookups: Record<string, any[]>) {
  if (!relation) return value ?? '—';
  const found = (lookups[relation.table] || []).find((r) => String(r[relation.key]) === String(value));
  return found?.[relation.label] || '—';
}

export async function dashboardData() {
  noStore();
  const [karyawan, tugas, kasbon, cuti, gaji, absensi, pengumuman, lookups] = await Promise.all([
    listRows('karyawan'), listRows('tugas'), listRows('kasbon'), listRows('cuti'), listRows('gaji'), listRows('absensi'), listRows('pengumuman'), getLookups()
  ]);
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const today = now.toISOString().slice(0, 10);
  const totalKaryawan = karyawan.filter((x: any) => x.status === 'aktif').length;
  const totalKaryawanAll = karyawan.length;
  const tugasPending = tugas.filter((x: any) => ['pending', 'in_progress'].includes(x.status)).length;
  const tugasSelesai = tugas.filter((x: any) => x.status === 'completed' && new Date(x.updated_at).getMonth() + 1 === bulan).length;
  const kasbonPending = kasbon.filter((x: any) => x.status === 'pending').length;
  const totalKasbonAktif = kasbon.filter((x: any) => x.status === 'approved').reduce((s: number, x: any) => s + Number(x.sisa || 0), 0);
  const cutiPending = cuti.filter((x: any) => x.status === 'pending').length;
  const gajiBulanIni = gaji.filter((x: any) => Number(x.bulan) === bulan && Number(x.tahun) === tahun).reduce((s: number, x: any) => s + Number(x.gaji_bersih || 0), 0);
  const gajiPaid = gaji.filter((x: any) => Number(x.bulan) === bulan && Number(x.tahun) === tahun && x.status === 'paid').length;
  const absensiHariIni = absensi.filter((x: any) => x.tanggal === today && x.status === 'hadir').length;
  const absensiHadirBulanIni = absensi.filter((x: any) => String(x.tanggal || '').slice(0, 7) === `${tahun}-${String(bulan).padStart(2, '0')}` && x.status === 'hadir').length;
  const tugasOverdue = tugas.filter((x: any) => !['completed', 'cancelled'].includes(x.status) && x.deadline && x.deadline < today).length;

  const grafikGaji = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(tahun, bulan - 1 - (5 - idx), 1);
    const b = d.getMonth() + 1;
    const t = d.getFullYear();
    return {
      bulan: d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
      total: gaji.filter((x: any) => Number(x.bulan) === b && Number(x.tahun) === t).reduce((s: number, x: any) => s + Number(x.gaji_bersih || 0), 0)
    };
  });
  const grafikTugas = tugas.reduce((acc: Record<string, number>, x: any) => {
    acc[x.status] = (acc[x.status] || 0) + 1;
    return acc;
  }, {});
  const tugasTerbaru = tugas.slice(0, 5).map((t: any) => ({ ...t, karyawan_nama: relationLabel(t.karyawan_id, { table: 'karyawan', key: 'id', label: 'nama' }, lookups) }));
  const pengumumanAktif = pengumuman.filter((p: any) => p.is_active && (!p.tanggal_selesai || p.tanggal_selesai >= today)).slice(0, 5);

  const smartActions = [
    cutiPending ? `${cutiPending} pengajuan cuti perlu keputusan` : 'Tidak ada cuti pending',
    kasbonPending ? `${kasbonPending} kasbon perlu approval` : 'Tidak ada kasbon pending',
    tugasOverdue ? `${tugasOverdue} tugas overdue perlu follow-up` : 'Tidak ada tugas overdue',
    gajiPaid < totalKaryawan ? 'Payroll bulan ini belum semua dibayar' : 'Payroll bulan ini sudah aman'
  ];

  return { totalKaryawan, totalKaryawanAll, tugasPending, tugasSelesai, kasbonPending, totalKasbonAktif, cutiPending, gajiBulanIni, gajiPaid, absensiHariIni, absensiHadirBulanIni, tugasOverdue, grafikGaji, grafikTugas, tugasTerbaru, pengumuman: pengumumanAktif, smartActions };
}

export async function moduleRows(config: ModuleConfig, query: Record<string, any>) {
  noStore();
  const all = await listRows(config.table);
  const lookups = await getLookups();
  const q = String(query.search || '').toLowerCase().trim();
  const { bulan, tahun } = monthYearNow();
  const bulanParam = Number(query.bulan || bulan);
  const tahunParam = Number(query.tahun || tahun);
  let filtered = all;

  if (config.monthly) {
    if (config.slug === 'gaji' || config.slug === 'absensi-bulanan') filtered = filtered.filter((r: any) => Number(r.bulan) === bulanParam && Number(r.tahun) === tahunParam);
    if (config.slug === 'absensi') filtered = filtered.filter((r: any) => String(r.tanggal || '').slice(0, 7) === `${tahunParam}-${String(bulanParam).padStart(2, '0')}`);
  }
  if (q) {
    filtered = filtered.filter((row: any) => {
      const own = config.searchFields.some((f) => String(row[f] || '').toLowerCase().includes(q));
      const rel = config.columns.some((c) => c.relation && relationLabel(row[c.key], c.relation, lookups).toLowerCase().includes(q));
      return own || rel;
    });
  }
  for (const filter of config.filters || []) {
    const val = query[filter.name];
    if (val) filtered = filtered.filter((r: any) => String(r[filter.name]) === String(val));
  }

  // Pastikan urutan tabel selalu konsisten. Tanpa sort stabil, Postgres bisa
  // mengembalikan urutan berbeda setelah UPDATE karena posisi fisik row berubah.
  filtered = [...filtered].sort((a: any, b: any) => Number(a.id || 0) - Number(b.id || 0));

  return { rows: filtered, all, lookups, bulan: bulanParam, tahun: tahunParam };
}

export function findConfigOrThrow(slug: string) {
  const config = getModule(slug);
  if (!config) throw new Error('Modul tidak ditemukan');
  return config;
}
