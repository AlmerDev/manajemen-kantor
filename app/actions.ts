'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { clearSession, createSession, requireUser } from '@/lib/session';
import { findConfigOrThrow } from '@/lib/data';
import { Field } from '@/lib/modules';
import { todayISO } from '@/lib/format';

function num(value: any) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value) || 0;
}


function safeReturnTo(moduleSlug: string, formData?: FormData | null, fallback?: string) {
  const defaultPath = fallback || `/${moduleSlug}`;
  const raw = String(formData?.get('_returnTo') || defaultPath);
  try {
    const url = new URL(raw, 'http://local.test');
    url.searchParams.delete('success');
    url.searchParams.delete('error');
    url.searchParams.delete('_flash');
    const path = `${url.pathname}${url.search}`;
    if (!url.pathname.startsWith(`/${moduleSlug}`)) return defaultPath;
    return path;
  } catch {
    return defaultPath;
  }
}

function addFlash(path: string, type: 'success' | 'error', message: string) {
  const url = new URL(path, 'http://local.test');
  url.searchParams.delete(type === 'success' ? 'error' : 'success');
  url.searchParams.set(type, message);
  // Biar setiap aksi benar-benar trigger update URL, sehingga loading toast tidak nyangkut.
  url.searchParams.set('_flash', String(Date.now()));
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function redirectBack(moduleSlug: string, formData: FormData | undefined | null, type: 'success' | 'error', message: string) {
  redirect(addFlash(safeReturnTo(moduleSlug, formData), type, message));
}

function refreshModuleViews(moduleSlug: string, ids: Array<string | number | null | undefined> = []) {
  // Paksa semua halaman terkait ambil data baru setelah create/update/delete.
  // Ini mencegah kasus list sudah berubah, tapi detail/edit masih menampilkan cache lama.
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath(`/${moduleSlug}`);
  for (const rawId of ids) {
    if (rawId === null || rawId === undefined || rawId === '') continue;
    const id = String(rawId);
    revalidatePath(`/${moduleSlug}/${id}`);
    revalidatePath(`/${moduleSlug}/${id}/edit`);
  }
}


async function applyKasbonDeduction(karyawanId: number, amount: number) {
  let remaining = Math.max(0, Number(amount || 0));
  if (!remaining) return 0;
  const { data: kasbons } = await supabaseAdmin
    .from('kasbon')
    .select('*')
    .eq('karyawan_id', karyawanId)
    .eq('status', 'approved')
    .gt('sisa', 0)
    .order('tanggal_pinjam', { ascending: true })
    .order('id', { ascending: true });

  let deducted = 0;
  for (const kasbon of kasbons || []) {
    if (remaining <= 0) break;
    const currentSisa = Number(kasbon.sisa || 0);
    const potong = Math.min(currentSisa, remaining);
    const nextSisa = Math.max(0, currentSisa - potong);
    const { error } = await supabaseAdmin
      .from('kasbon')
      .update({ sisa: nextSisa, status: nextSisa <= 0 ? 'lunas' : 'approved' })
      .eq('id', kasbon.id);
    if (!error) {
      deducted += potong;
      remaining -= potong;
    }
  }
  return deducted;
}

function parseValue(field: Field, formData: FormData) {
  if (field.type === 'checkbox') { const values = formData.getAll(field.name).map(String); return values.includes('on') || values.includes('true'); }
  if (field.type === 'file') return undefined;
  const raw = formData.get(field.name);
  if (raw === null || raw === '') return null;
  if (field.type === 'number') return Number(raw);
  return String(raw);
}

async function uploadFile(moduleSlug: string, field: Field, formData: FormData) {
  const file = formData.get(field.name);
  if (!(file instanceof File) || file.size === 0) return undefined;
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || 'bin';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${moduleSlug}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${ext}`.replace(`.${ext}.${ext}`, `.${ext}`);
  const { error } = await supabaseAdmin.storage.from('office-files').upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

async function uploadOfficeAsset(fieldName: string, formData: FormData) {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith('image/')) throw new Error('File logo harus berupa gambar.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran logo maksimal 2MB.');
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `office_settings/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  const { error } = await supabaseAdmin.storage.from('office-files').upload(path, bytes, { contentType: file.type || 'image/png', upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

function hitungGaji(data: any) {
  const hadir = num(data.total_hadir);
  data.uang_makan = hadir * num(data.tarif_uang_makan_harian);
  data.transport = hadir * num(data.tarif_transport_harian);
  data.uang_lain_harian = hadir * num(data.tarif_lain_harian);
  const totalPendapatan = num(data.gaji_pokok) + num(data.uang_makan) + num(data.transport) + num(data.uang_lain_harian) + num(data.insentif) + num(data.bonus) + num(data.tunjangan) + num(data.thr) + num(data.tunjangan_lain);
  const totalPotongan = num(data.bpjs_kesehatan) + num(data.bpjs_ketenagakerjaan) + num(data.potongan_kasbon) + num(data.potongan_lain);
  data.total_pendapatan = totalPendapatan;
  data.total_potongan = totalPotongan;
  data.gaji_bersih = totalPendapatan - totalPotongan;
  return data;
}

function monthRange(bulan: number, tahun: number) {
  const start = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const next = new Date(tahun, bulan, 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, end };
}

async function getAbsensiSummary(karyawanId: number, bulan: number, tahun: number) {
  const { data: monthly } = await supabaseAdmin
    .from('absensi_bulanan')
    .select('*')
    .eq('karyawan_id', karyawanId)
    .eq('bulan', bulan)
    .eq('tahun', tahun)
    .maybeSingle();

  if (monthly) {
    return {
      total_hadir: num(monthly.total_hadir),
      total_izin: num(monthly.total_izin),
      total_sakit: num(monthly.total_sakit),
      total_alpha: num(monthly.total_alpha),
      total_cuti: num(monthly.total_cuti)
    };
  }

  const { start, end } = monthRange(bulan, tahun);
  const { data: daily } = await supabaseAdmin
    .from('absensi')
    .select('status')
    .eq('karyawan_id', karyawanId)
    .gte('tanggal', start)
    .lt('tanggal', end);

  const summary = { total_hadir: 0, total_izin: 0, total_sakit: 0, total_alpha: 0, total_cuti: 0 };
  for (const row of daily || []) {
    if (row.status === 'hadir') summary.total_hadir += 1;
    if (row.status === 'izin') summary.total_izin += 1;
    if (row.status === 'sakit') summary.total_sakit += 1;
    if (row.status === 'alpha') summary.total_alpha += 1;
    if (row.status === 'cuti') summary.total_cuti += 1;
  }
  return summary;
}

function getMonthYearFromDate(value: any) {
  const text = String(value || '').slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const tahun = Number(match[1]);
  const bulan = Number(match[2]);
  if (!tahun || bulan < 1 || bulan > 12) return null;
  return { bulan, tahun };
}

async function countAbsensiHarian(karyawanId: number, bulan: number, tahun: number) {
  const { start, end } = monthRange(bulan, tahun);
  const { data: daily, error } = await supabaseAdmin
    .from('absensi')
    .select('status')
    .eq('karyawan_id', karyawanId)
    .gte('tanggal', start)
    .lt('tanggal', end);

  if (error) throw new Error(error.message);
  const summary = { total_hadir: 0, total_izin: 0, total_sakit: 0, total_alpha: 0, total_cuti: 0 };
  for (const row of daily || []) {
    if (row.status === 'hadir') summary.total_hadir += 1;
    if (row.status === 'izin') summary.total_izin += 1;
    if (row.status === 'sakit') summary.total_sakit += 1;
    if (row.status === 'alpha') summary.total_alpha += 1;
    if (row.status === 'cuti') summary.total_cuti += 1;
  }
  return summary;
}

async function syncAbsensiBulananFromDaily(karyawanId: number, tanggal: any) {
  const period = getMonthYearFromDate(tanggal);
  if (!karyawanId || !period) return;
  const summary = await countAbsensiHarian(karyawanId, period.bulan, period.tahun);
  const { error } = await supabaseAdmin.from('absensi_bulanan').upsert({
    karyawan_id: karyawanId,
    bulan: period.bulan,
    tahun: period.tahun,
    ...summary,
    keterangan: 'Rekap otomatis dari absensi harian.'
  }, { onConflict: 'karyawan_id,bulan,tahun' });
  if (error) throw new Error(error.message);
}

async function syncAbsensiBulananFromRows(rows: Array<any | null | undefined>) {
  const done = new Set<string>();
  for (const row of rows) {
    if (!row?.karyawan_id || !row?.tanggal) continue;
    const period = getMonthYearFromDate(row.tanggal);
    if (!period) continue;
    const key = `${row.karyawan_id}-${period.bulan}-${period.tahun}`;
    if (done.has(key)) continue;
    done.add(key);
    await syncAbsensiBulananFromDaily(Number(row.karyawan_id), row.tanggal);
  }
}


async function getKasbonInstallment(karyawanId: number) {
  const { data: kasbon } = await supabaseAdmin
    .from('kasbon')
    .select('*')
    .eq('karyawan_id', karyawanId)
    .eq('status', 'approved')
    .gt('sisa', 0)
    .order('tanggal_pinjam', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  return kasbon ? Math.min(Number(kasbon.sisa || 0), Number(kasbon.cicilan_per_bulan || kasbon.sisa || 0)) : 0;
}

async function buildPayrollAutoUpdate(existing: any) {
  const karyawanId = Number(existing.karyawan_id);
  const bulan = Number(existing.bulan);
  const tahun = Number(existing.tahun);
  const { data: karyawan } = await supabaseAdmin.from('karyawan').select('*').eq('id', karyawanId).maybeSingle();
  if (!karyawan) return null;

  const [{ data: jabatan }, { data: struktur }, summary, potonganKasbon] = await Promise.all([
    supabaseAdmin.from('jabatan').select('*').eq('id', karyawan.jabatan_id).maybeSingle(),
    supabaseAdmin.from('data_gaji').select('*').eq('karyawan_id', karyawanId).eq('is_active', true).maybeSingle(),
    getAbsensiSummary(karyawanId, bulan, tahun),
    getKasbonInstallment(karyawanId)
  ]);

  const next = hitungGaji({
    ...existing,
    ...summary,
    gaji_pokok: Number(struktur?.gaji_pokok ?? jabatan?.gaji_pokok_default ?? existing.gaji_pokok ?? 0),
    tarif_uang_makan_harian: Number(struktur?.uang_makan_harian ?? existing.tarif_uang_makan_harian ?? 0),
    tarif_transport_harian: Number(struktur?.transport_harian ?? existing.tarif_transport_harian ?? 0),
    tarif_lain_harian: Number(struktur?.tunjangan_harian ?? existing.tarif_lain_harian ?? 0),
    bpjs_kesehatan: Number(struktur?.bpjs_kesehatan_default ?? existing.bpjs_kesehatan ?? 0),
    bpjs_ketenagakerjaan: Number(struktur?.bpjs_ketenagakerjaan_default ?? existing.bpjs_ketenagakerjaan ?? 0),
    potongan_lain: Number(struktur?.potongan_lain_default ?? existing.potongan_lain ?? 0),
    potongan_kasbon: potonganKasbon,
    catatan: existing.catatan || 'Nilai otomatis mengikuti Data Gaji dan Absensi Bulanan.'
  });

  delete next.id;
  delete next.created_at;
  delete next.updated_at;
  delete next.karyawan;
  return next;
}

async function syncGajiForPeriod(karyawanId: number, bulan: number, tahun: number) {
  if (!karyawanId || !bulan || !tahun) return 0;
  const { data: rows, error } = await supabaseAdmin
    .from('gaji')
    .select('*')
    .eq('karyawan_id', karyawanId)
    .eq('bulan', bulan)
    .eq('tahun', tahun)
    .neq('status', 'paid');
  if (error) throw new Error(error.message);

  let updated = 0;
  for (const row of rows || []) {
    const next = await buildPayrollAutoUpdate(row);
    if (!next) continue;
    const { error: updateError } = await supabaseAdmin.from('gaji').update(next).eq('id', row.id);
    if (updateError) throw new Error(updateError.message);
    updated++;
  }
  return updated;
}

async function syncGajiForKaryawan(karyawanId: number) {
  if (!karyawanId) return 0;
  const { data: rows, error } = await supabaseAdmin
    .from('gaji')
    .select('*')
    .eq('karyawan_id', karyawanId)
    .neq('status', 'paid');
  if (error) throw new Error(error.message);

  let updated = 0;
  for (const row of rows || []) {
    const next = await buildPayrollAutoUpdate(row);
    if (!next) continue;
    const { error: updateError } = await supabaseAdmin.from('gaji').update(next).eq('id', row.id);
    if (updateError) throw new Error(updateError.message);
    updated++;
  }
  return updated;
}

async function syncGajiFromAbsensiRows(rows: Array<any | null | undefined>) {
  const done = new Set<string>();
  for (const row of rows) {
    if (!row?.karyawan_id || !row?.tanggal) continue;
    const period = getMonthYearFromDate(row.tanggal);
    if (!period) continue;
    const key = `${row.karyawan_id}-${period.bulan}-${period.tahun}`;
    if (done.has(key)) continue;
    done.add(key);
    await syncGajiForPeriod(Number(row.karyawan_id), period.bulan, period.tahun);
  }
}

async function preprocess(moduleSlug: string, data: any, mode: 'create' | 'update', currentUser: any, oldRow?: any) {
  if (moduleSlug === 'gaji') {
    ['total_hadir','total_izin','total_sakit','total_alpha','total_cuti','tarif_uang_makan_harian','tarif_transport_harian','tarif_lain_harian','uang_makan','transport','uang_lain_harian','insentif','bonus','tunjangan','thr','tunjangan_lain','bpjs_kesehatan','bpjs_ketenagakerjaan','potongan_kasbon','potongan_lain'].forEach((k) => data[k] = num(data[k]));
    data.gaji_pokok = num(data.gaji_pokok);
    if (mode === 'create') data.status = data.status || 'draft';
    if (data.status === 'paid' && !oldRow?.tanggal_bayar) data.tanggal_bayar = new Date().toISOString();
    hitungGaji(data);
  }
  if (moduleSlug === 'data-gaji') {
    ['gaji_pokok','uang_makan_harian','transport_harian','tunjangan_harian','bpjs_kesehatan_default','bpjs_ketenagakerjaan_default','potongan_lain_default'].forEach((k) => data[k] = num(data[k]));
    if (data.is_active === null || data.is_active === undefined) data.is_active = false;
  }
  if (moduleSlug === 'absensi-bulanan') {
    ['bulan','tahun','total_hadir','total_izin','total_sakit','total_alpha','total_cuti'].forEach((k) => data[k] = num(data[k]));
  }
  if (moduleSlug === 'kasbon') {
    data.jumlah = num(data.jumlah);
    data.cicilan_bulan = Math.max(1, num(data.cicilan_bulan));
    data.cicilan_per_bulan = Math.round(data.jumlah / data.cicilan_bulan);
    if (mode === 'create') {
      data.sisa = data.jumlah;
      data.status = data.status || 'pending';
    } else if (oldRow?.status !== 'approved' && data.status === 'approved') {
      data.sisa = data.jumlah;
    }
  }
  if (moduleSlug === 'tugas') {
    if (mode === 'create') {
      data.assigned_by = currentUser.id;
      data.status = 'pending';
      data.progress = 0;
    }
    if (data.status === 'completed' && !oldRow?.tanggal_selesai) {
      data.tanggal_selesai = todayISO();
      data.progress = 100;
    }
  }
  if (moduleSlug === 'pengumuman') {
    if (mode === 'create') data.created_by = currentUser.id;
    if (data.is_active === null || data.is_active === undefined) data.is_active = false;
  }
  if (moduleSlug === 'cuti') {
    if (data.tanggal_mulai && data.tanggal_selesai) {
      const a = new Date(data.tanggal_mulai);
      const b = new Date(data.tanggal_selesai);
      data.jumlah_hari = Math.max(1, Math.round((+b - +a) / 86400000) + 1);
    }
    if (mode === 'create') data.status = 'pending';
  }
  return data;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const remember = formData.get('remember') === '1' || formData.get('remember') === 'on';
  const { data: user } = await supabaseAdmin.from('users').select('*').eq('email', email).single();
  if (!user) redirect(`/login?error=${encodeURIComponent('Email atau password salah.')}&email=${encodeURIComponent(email)}`);
  const hash = String(user.password || '').replace(/^\$2y\$/, '$2b$');
  const ok = await bcrypt.compare(password, hash);
  if (!ok) redirect(`/login?error=${encodeURIComponent('Email atau password salah.')}&email=${encodeURIComponent(email)}`);
  await createSession(Number(user.id), remember);
  redirect('/dashboard');
}

export async function logoutAction() {
  clearSession();
  redirect('/login?success=Anda berhasil logout.');
}

export async function saveRecord(moduleSlug: string, mode: 'create' | 'update', id: string | null, formData: FormData) {
  const user = await requireUser();
  const config = findConfigOrThrow(moduleSlug);
  const data: any = {};
  let oldRow: any = null;
  if (mode === 'update' && id) {
    const old = await supabaseAdmin.from(config.table).select('*').eq('id', id).single();
    oldRow = old.data;
  }
  for (const field of config.fields) {
    if (mode === 'create' && field.editOnly) continue;
    if (mode === 'update' && field.createOnly) continue;
    if (field.type === 'file') {
      const uploaded = await uploadFile(moduleSlug, field, formData);
      if (uploaded) data[field.name] = uploaded;
      continue;
    }
    const val = parseValue(field, formData);
    if (val !== undefined) data[field.name] = val;
  }
  await preprocess(moduleSlug, data, mode, user, oldRow);
  const result = mode === 'create'
    ? await supabaseAdmin.from(config.table).insert(data).select('*').single()
    : await supabaseAdmin.from(config.table).update(data).eq('id', id).select('*').single();
  if (result.error) redirect(`/${moduleSlug}${mode === 'create' ? '/create' : `/${id}/edit`}?error=${encodeURIComponent(result.error.message)}`);
  const savedRow: any = result.data || null;

  if (moduleSlug === 'absensi') {
    const affectedRows = [{ ...oldRow, ...data }, oldRow];
    await syncAbsensiBulananFromRows(affectedRows);
    await syncGajiFromAbsensiRows(affectedRows);
    revalidatePath('/absensi-bulanan');
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  if (moduleSlug === 'absensi-bulanan') {
    const affected = [data, oldRow].filter(Boolean);
    const done = new Set<string>();
    for (const row of affected) {
      const karyawanId = Number(row.karyawan_id);
      const bulan = Number(row.bulan);
      const tahun = Number(row.tahun);
      const key = `${karyawanId}-${bulan}-${tahun}`;
      if (!karyawanId || !bulan || !tahun || done.has(key)) continue;
      done.add(key);
      await syncGajiForPeriod(karyawanId, bulan, tahun);
    }
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  if (moduleSlug === 'data-gaji') {
    const ids = Array.from(new Set([data.karyawan_id, oldRow?.karyawan_id].map(Number).filter(Boolean)));
    for (const karyawanId of ids) await syncGajiForKaryawan(karyawanId);
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  if (moduleSlug === 'karyawan') {
    await syncGajiForKaryawan(Number(id || data.id || oldRow?.id));
    revalidatePath('/data-gaji');
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  if (moduleSlug === 'kasbon') {
    await syncGajiForKaryawan(Number(data.karyawan_id || oldRow?.karyawan_id));
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  if (moduleSlug === 'jabatan') {
    const { data: karyawanRows } = await supabaseAdmin.from('karyawan').select('id').eq('jabatan_id', Number(id));
    for (const k of karyawanRows || []) await syncGajiForKaryawan(Number(k.id));
    revalidatePath('/data-gaji');
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  refreshModuleViews(moduleSlug, [id, oldRow?.id, data.id, savedRow?.id]);
  if (mode === 'update' && id) {
    // Pastikan halaman detail/edit langsung fresh setelah data disimpan.
    revalidatePath(`/${moduleSlug}/${id}`, 'page');
    revalidatePath(`/${moduleSlug}/${id}/edit`, 'page');
  }
  redirectBack(moduleSlug, formData, 'success', `${config.single} berhasil ${mode === 'create' ? 'ditambahkan' : 'diperbarui'}.`);
}

export async function deleteRecord(moduleSlug: string, id: string, formData?: FormData) {
  await requireUser();
  const config = findConfigOrThrow(moduleSlug);
  let oldRow: any = null;
  if (['absensi', 'absensi-bulanan', 'data-gaji'].includes(moduleSlug)) {
    const old = await supabaseAdmin.from(config.table).select('*').eq('id', id).maybeSingle();
    oldRow = old.data;
  }
  const { error } = await supabaseAdmin.from(config.table).delete().eq('id', id);
  if (error) redirectBack(moduleSlug, formData, 'error', error.message);

  if (moduleSlug === 'absensi') {
    await syncAbsensiBulananFromRows([oldRow]);
    await syncGajiFromAbsensiRows([oldRow]);
    revalidatePath('/absensi-bulanan');
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  if (moduleSlug === 'absensi-bulanan' && oldRow) {
    await syncGajiForPeriod(Number(oldRow.karyawan_id), Number(oldRow.bulan), Number(oldRow.tahun));
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  if (moduleSlug === 'data-gaji' && oldRow) {
    await syncGajiForKaryawan(Number(oldRow.karyawan_id));
    revalidatePath('/gaji');
    revalidatePath('/dashboard');
  }

  refreshModuleViews(moduleSlug, [id, oldRow?.id]);
  redirectBack(moduleSlug, formData, 'success', `${config.single} berhasil dihapus.`);
}

export async function quickStatus(moduleSlug: string, id: string, status: string, formData?: FormData) {
  await requireUser();
  const config = findConfigOrThrow(moduleSlug);
  const update: any = { status };
  let successMessage = 'Status berhasil diperbarui.';

  if (moduleSlug === 'gaji' && status === 'paid') {
    const { data: gaji } = await supabaseAdmin.from('gaji').select('*').eq('id', id).single();
    if (!gaji) redirectBack(moduleSlug, formData, 'error', 'Data gaji tidak ditemukan.');
    if (gaji.status === 'paid') {
      redirectBack(moduleSlug, formData, 'success', 'Gaji ini sudah pernah ditandai dibayar.');
    }
    if (gaji.status !== 'approved') {
      redirectBack(moduleSlug, formData, 'error', 'Gaji harus di-approve dulu sebelum bisa dibayar.');
    }
    update.tanggal_bayar = new Date().toISOString();
    const potonganKasbon = Number(gaji.potongan_kasbon || 0);
    if (potonganKasbon > 0) {
      const deducted = await applyKasbonDeduction(Number(gaji.karyawan_id), potonganKasbon);
      successMessage = deducted > 0
        ? `Gaji dibayar dan sisa kasbon otomatis dipotong ${deducted.toLocaleString('id-ID')}.`
        : 'Gaji dibayar. Tidak ada kasbon aktif yang perlu dipotong.';
    } else {
      successMessage = 'Gaji berhasil ditandai dibayar.';
    }
  }

  if (moduleSlug === 'gaji' && status === 'approved') {
    successMessage = 'Gaji berhasil di-approve.';
  }

  let kasbonKaryawanId: number | null = null;
  if (moduleSlug === 'kasbon' && status === 'approved') {
    const { data: kasbon } = await supabaseAdmin.from('kasbon').select('jumlah,karyawan_id').eq('id', id).single();
    update.sisa = kasbon?.jumlah || 0;
    kasbonKaryawanId = Number(kasbon?.karyawan_id || 0) || null;
    successMessage = 'Kasbon berhasil disetujui.';
  }
  if (moduleSlug === 'kasbon' && status === 'rejected') {
    const { data: kasbon } = await supabaseAdmin.from('kasbon').select('karyawan_id').eq('id', id).single();
    kasbonKaryawanId = Number(kasbon?.karyawan_id || 0) || null;
    successMessage = 'Kasbon berhasil ditolak.';
  }

  if (moduleSlug === 'tugas') {
    update.progress = Number(formData?.get('progress') || 0);
    if (status === 'completed') { update.progress = 100; update.tanggal_selesai = todayISO(); }
  }
  if (moduleSlug === 'cuti') {
    update.catatan_admin = String(formData?.get('catatan_admin') || '');
    successMessage = status === 'approved' ? 'Pengajuan cuti berhasil disetujui.' : 'Pengajuan cuti berhasil ditolak.';
  }
  const { error } = await supabaseAdmin.from(config.table).update(update).eq('id', id);
  if (error) redirectBack(moduleSlug, formData, 'error', error.message);
  refreshModuleViews(moduleSlug, [id]);
  if (moduleSlug === 'gaji' && status === 'paid') revalidatePath('/kasbon');
  if (moduleSlug === 'kasbon' && kasbonKaryawanId) {
    await syncGajiForKaryawan(kasbonKaryawanId);
    revalidatePath('/gaji');
  }
  if (moduleSlug === 'kasbon' || moduleSlug === 'gaji') revalidatePath('/dashboard');
  redirectBack(moduleSlug, formData, 'success', successMessage);
}

export async function togglePengumuman(id: string, formData?: FormData) {
  await requireUser();
  const { data } = await supabaseAdmin.from('pengumuman').select('is_active').eq('id', id).single();
  const next = !data?.is_active;
  const { error } = await supabaseAdmin.from('pengumuman').update({ is_active: next }).eq('id', id);
  if (error) redirectBack('pengumuman', formData, 'error', error.message);
  refreshModuleViews('pengumuman', [id]);
  redirectBack('pengumuman', formData, 'success', `Pengumuman berhasil ${next ? 'diaktifkan' : 'dinonaktifkan'}.`);
}

export async function bulkAbsensi(formData: FormData) {
  await requireUser();
  const tanggal = String(formData.get('tanggal') || todayISO());
  const status = String(formData.get('status') || 'hadir');
  const jam_masuk = String(formData.get('jam_masuk') || '') || null;
  const ids = formData.getAll('karyawan_ids').map(String);
  let created = 0;
  let skipped = 0;
  for (const id of ids) {
    const { error } = await supabaseAdmin.from('absensi').insert({ karyawan_id: Number(id), tanggal, status, jam_masuk });
    if (!error) created++;
    else skipped++;
  }
  const affectedRows = ids.map((id) => ({ karyawan_id: Number(id), tanggal }));
  await syncAbsensiBulananFromRows(affectedRows);
  await syncGajiFromAbsensiRows(affectedRows);
  revalidatePath('/absensi');
  revalidatePath('/absensi-bulanan');
  revalidatePath('/gaji');
  revalidatePath('/dashboard');
  const date = new Date(tanggal);
  const base = safeReturnTo('absensi', formData);
  const url = new URL(base, 'http://local.test');
  if (!Number.isNaN(date.getTime())) {
    url.searchParams.set('bulan', String(date.getMonth() + 1));
    url.searchParams.set('tahun', String(date.getFullYear()));
  }
  url.searchParams.set('success', `${created} data absensi berhasil disimpan${skipped ? `, ${skipped} data dilewati karena sudah ada.` : '.'}`);
  url.searchParams.delete('error');
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}


export async function generateAbsensiBulanan(formData: FormData) {
  await requireUser();
  const bulan = Number(formData.get('bulan'));
  const tahun = Number(formData.get('tahun'));
  if (!bulan || bulan < 1 || bulan > 12 || !tahun) {
    redirectBack('absensi-bulanan', formData, 'error', 'Bulan atau tahun tidak valid.');
  }
  const { data: karyawan, error } = await supabaseAdmin.from('karyawan').select('id,nama').eq('status', 'aktif').order('nama');
  if (error) redirectBack('absensi-bulanan', formData, 'error', error.message);

  let synced = 0;
  let failed = 0;
  for (const k of karyawan || []) {
    const summary = await getAbsensiSummary(Number(k.id), bulan, tahun);
    const { error: upsertError } = await supabaseAdmin.from('absensi_bulanan').upsert({
      karyawan_id: Number(k.id),
      bulan,
      tahun,
      ...summary,
      keterangan: 'Rekap otomatis dari data absensi harian / siap disambungkan ke scan QR.'
    }, { onConflict: 'karyawan_id,bulan,tahun' });
    if (upsertError) failed++;
    else {
      await syncGajiForPeriod(Number(k.id), bulan, tahun);
      synced++;
    }
  }

  revalidatePath('/absensi-bulanan');
  revalidatePath('/gaji');
  revalidatePath('/dashboard');
  const base = safeReturnTo('absensi-bulanan', formData);
  const url = new URL(base, 'http://local.test');
  url.searchParams.set('bulan', String(bulan));
  url.searchParams.set('tahun', String(tahun));
  url.searchParams.delete('error');
  url.searchParams.set('success', `${synced} rekap absensi bulanan berhasil disinkronkan${failed ? `, ${failed} gagal.` : '.'}`);
  url.searchParams.set('_flash', String(Date.now()));
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

export async function generateBulkGaji(formData: FormData) {
  await requireUser();
  const bulan = Number(formData.get('bulan'));
  const tahun = Number(formData.get('tahun'));
  if (!bulan || bulan < 1 || bulan > 12 || !tahun) {
    redirectBack('gaji', formData, 'error', 'Bulan atau tahun tidak valid.');
  }
  const { data: karyawan, error: karyawanError } = await supabaseAdmin.from('karyawan').select('*').eq('status', 'aktif').order('nama');
  const { data: jabatan, error: jabatanError } = await supabaseAdmin.from('jabatan').select('*');
  const { data: dataGaji, error: dataGajiError } = await supabaseAdmin.from('data_gaji').select('*').eq('is_active', true);
  if (karyawanError || jabatanError || dataGajiError) {
    redirectBack('gaji', formData, 'error', karyawanError?.message || jabatanError?.message || dataGajiError?.message || 'Gagal mengambil data karyawan.');
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;
  for (const k of karyawan || []) {
    const { data: exists } = await supabaseAdmin.from('gaji').select('id').eq('karyawan_id', k.id).eq('bulan', bulan).eq('tahun', tahun).maybeSingle();
    if (exists) { skipped++; continue; }
    const jab = (jabatan || []).find((j: any) => String(j.id) === String(k.jabatan_id));
    const struktur = (dataGaji || []).find((g: any) => String(g.karyawan_id) === String(k.id));
    const summary = await getAbsensiSummary(Number(k.id), bulan, tahun);
    const { data: kasbon } = await supabaseAdmin
      .from('kasbon')
      .select('*')
      .eq('karyawan_id', k.id)
      .eq('status', 'approved')
      .gt('sisa', 0)
      .order('tanggal_pinjam', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    const potonganKasbon = kasbon ? Math.min(Number(kasbon.sisa || 0), Number(kasbon.cicilan_per_bulan || kasbon.sisa || 0)) : 0;
    const row: any = hitungGaji({
      karyawan_id: k.id,
      bulan,
      tahun,
      ...summary,
      gaji_pokok: Number(struktur?.gaji_pokok ?? jab?.gaji_pokok_default ?? 0),
      tarif_uang_makan_harian: Number(struktur?.uang_makan_harian || 0),
      tarif_transport_harian: Number(struktur?.transport_harian || 0),
      tarif_lain_harian: Number(struktur?.tunjangan_harian || 0),
      insentif: 0,
      bonus: 0,
      tunjangan: 0,
      thr: 0,
      tunjangan_lain: 0,
      bpjs_kesehatan: Number(struktur?.bpjs_kesehatan_default || 0),
      bpjs_ketenagakerjaan: Number(struktur?.bpjs_ketenagakerjaan_default || 0),
      potongan_kasbon: potonganKasbon,
      potongan_lain: Number(struktur?.potongan_lain_default || 0),
      status: 'draft',
      catatan: `Generate otomatis. Hadir ${summary.total_hadir} hari. ${potonganKasbon > 0 ? 'Ada potongan kasbon otomatis.' : ''}`.trim()
    });
    const { error } = await supabaseAdmin.from('gaji').insert(row);
    if (error) failed++;
    else created++;
  }

  revalidatePath('/gaji');
  const base = safeReturnTo('gaji', formData);
  const url = new URL(base, 'http://local.test');
  url.searchParams.set('bulan', String(bulan));
  url.searchParams.set('tahun', String(tahun));
  url.searchParams.delete('error');
  url.searchParams.set('success', created > 0
    ? `${created} data gaji berhasil digenerate.${skipped ? ` ${skipped} data sudah ada dan dilewati.` : ''}${failed ? ` ${failed} data gagal dibuat.` : ''}`
    : `Tidak ada data baru dibuat. ${skipped ? `${skipped} data payroll periode ini sudah ada.` : 'Cek data karyawan aktif dan jabatan.'}${failed ? ` ${failed} data gagal dibuat.` : ''}`);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}


export async function updateOfficeSettings(formData: FormData) {
  await requireUser();
  const data: any = {
    id: 1,
    office_name: String(formData.get('office_name') || '').trim() || 'Kantor',
    panel_name: String(formData.get('panel_name') || '').trim() || 'Office OS',
    tagline: String(formData.get('tagline') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    address: String(formData.get('address') || '').trim() || null,
    website: String(formData.get('website') || '').trim() || null,
    city: String(formData.get('city') || '').trim() || null,
    work_hours: String(formData.get('work_hours') || '').trim() || null,
    footer_note: String(formData.get('footer_note') || '').trim() || null
  };

  let uploaded: string | undefined;
  try {
    uploaded = await uploadOfficeAsset('logo', formData);
  } catch (error: any) {
    redirect(`/settings?error=${encodeURIComponent(error?.message || 'Gagal upload logo kantor.')}`);
  }
  if (uploaded) data.logo = uploaded;

  const { error } = await supabaseAdmin.from('office_settings').upsert(data, { onConflict: 'id' });
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  redirect('/settings?success=Setting kantor berhasil diperbarui.');
}

export async function deleteOfficeLogo() {
  await requireUser();
  const { error } = await supabaseAdmin.from('office_settings').update({ logo: null }).eq('id', 1);
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  redirect('/settings?success=Logo kantor berhasil dihapus.');
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get('name') || '');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const data: any = { name, email };
  const file = formData.get('foto');
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const path = `admin_fotos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { error } = await supabaseAdmin.storage.from('office-files').upload(path, bytes, { contentType: file.type || 'image/png', upsert: true });
    if (!error) data.avatar = path;
  }
  const { error } = await supabaseAdmin.from('users').update(data).eq('id', user.id);
  if (error) redirect(`/profil?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/profil');
  redirect('/profil?success=Profil berhasil diperbarui.');
}

export async function updatePassword(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get('current_password') || '');
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('password_confirmation') || '');
  const hash = String(user.password || '').replace(/^\$2y\$/, '$2b$');
  const ok = await bcrypt.compare(current, hash);
  if (!ok) redirect('/profil?error=Password saat ini tidak cocok.');
  if (password.length < 8) redirect('/profil?error=Password baru minimal 8 karakter.');
  if (password !== confirm) redirect('/profil?error=Konfirmasi password tidak sama.');
  const newHash = await bcrypt.hash(password, 12);
  await supabaseAdmin.from('users').update({ password: newHash }).eq('id', user.id);
  redirect('/profil?success=Password berhasil diubah.');
}

export async function deleteProfilePhoto() {
  const user = await requireUser();
  await supabaseAdmin.from('users').update({ avatar: null }).eq('id', user.id);
  revalidatePath('/profil');
  redirect('/profil?success=Foto profil berhasil dihapus.');
}
