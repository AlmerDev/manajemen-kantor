import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractAttendanceToken, jakartaNowParts, verifyAttendanceQrToken } from '@/lib/attendance-qr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AttendanceSummary = {
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_alpha: number;
  total_cuti: number;
};

function emptySummary(): AttendanceSummary {
  return { total_hadir: 0, total_izin: 0, total_sakit: 0, total_alpha: 0, total_cuti: 0 };
}

async function syncMonthly(karyawanId: number, bulan: number, tahun: number) {
  const start = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const next = new Date(tahun, bulan, 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
  const { data: daily, error } = await supabaseAdmin
    .from('absensi')
    .select('status')
    .eq('karyawan_id', karyawanId)
    .gte('tanggal', start)
    .lt('tanggal', end);

  if (error) throw new Error(error.message);
  const summary = emptySummary();
  for (const row of daily || []) {
    if (row.status === 'hadir') summary.total_hadir += 1;
    if (row.status === 'izin') summary.total_izin += 1;
    if (row.status === 'sakit') summary.total_sakit += 1;
    if (row.status === 'alpha') summary.total_alpha += 1;
    if (row.status === 'cuti') summary.total_cuti += 1;
  }

  const { error: upsertError } = await supabaseAdmin.from('absensi_bulanan').upsert({
    karyawan_id: karyawanId,
    bulan,
    tahun,
    ...summary,
    keterangan: 'Rekap otomatis dari scan QR / absensi harian.'
  }, { onConflict: 'karyawan_id,bulan,tahun' });
  if (upsertError) throw new Error(upsertError.message);
  return summary;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = extractAttendanceToken(String(body.token || body.qr || ''));
    const payload = verifyAttendanceQrToken(token);
    if (!payload) return NextResponse.json({ ok: false, message: 'QR absensi tidak valid.' }, { status: 400 });

    const { data: karyawan, error: karyawanError } = await supabaseAdmin
      .from('karyawan')
      .select('id,nip,nama,status,jabatan_id,departemen')
      .eq('id', payload.karyawanId)
      .single();

    if (karyawanError || !karyawan) return NextResponse.json({ ok: false, message: 'Data karyawan tidak ditemukan.' }, { status: 404 });
    if (karyawan.status !== 'aktif') return NextResponse.json({ ok: false, message: `Karyawan ${karyawan.nama} sedang tidak aktif.` }, { status: 409 });

    const now = jakartaNowParts();
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('absensi')
      .select('*')
      .eq('karyawan_id', karyawan.id)
      .eq('tanggal', now.date)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    let scanType: 'masuk' | 'keluar' | 'sudah_lengkap' | 'sudah_ada_status' = 'masuk';
    let row: any = null;

    if (!existing) {
      const { data: inserted, error } = await supabaseAdmin
        .from('absensi')
        .insert({
          karyawan_id: karyawan.id,
          tanggal: now.date,
          jam_masuk: now.time,
          status: 'hadir',
          keterangan: 'Absen masuk otomatis via scan QR.'
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
      scanType = 'masuk';
    } else if (existing.status !== 'hadir') {
      row = existing;
      scanType = 'sudah_ada_status';
    } else if (!existing.jam_keluar) {
      const { data: updated, error } = await supabaseAdmin
        .from('absensi')
        .update({
          jam_keluar: now.time,
          keterangan: `${existing.keterangan || 'Absen masuk via scan QR.'} Scan keluar otomatis via QR.`
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      row = updated;
      scanType = 'keluar';
    } else {
      row = existing;
      scanType = 'sudah_lengkap';
    }

    const summary = await syncMonthly(Number(karyawan.id), now.month, now.year);
    const message = scanType === 'masuk'
      ? `Absen masuk ${karyawan.nama} berhasil.`
      : scanType === 'keluar'
        ? `Absen keluar ${karyawan.nama} berhasil.`
        : scanType === 'sudah_ada_status'
          ? `Absensi hari ini sudah tercatat sebagai ${existing?.status}.`
          : `${karyawan.nama} sudah absen masuk dan keluar hari ini.`;

    return NextResponse.json({
      ok: true,
      message,
      scanType,
      karyawan: {
        id: karyawan.id,
        nip: karyawan.nip,
        nama: karyawan.nama,
        departemen: karyawan.departemen
      },
      absensi: row,
      summary,
      tanggal: now.date,
      waktu: now.time
    });
  } catch (error: any) {
    console.error('QR_ABSEN_ERROR:', error);
    return NextResponse.json({ ok: false, message: error?.message || 'Gagal memproses scan QR.' }, { status: 500 });
  }
}
