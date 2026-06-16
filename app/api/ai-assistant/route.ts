import { NextRequest, NextResponse } from 'next/server';
import { dashboardData } from '@/lib/data';
import { requireUser } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AiMode = 'overview' | 'priority' | 'meeting' | 'announcement' | 'risk' | 'attendance' | 'payroll' | 'document' | 'sop' | 'chat';

function trimText(value: unknown, max = 5000) {
  return String(value || '').slice(0, max).trim();
}

function compactRows(rows: any[], fields: string[], limit = 8) {
  return (rows || []).slice(0, limit).map((row) => {
    const item: Record<string, any> = {};
    fields.forEach((field) => item[field] = row[field]);
    return item;
  });
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

async function getRecentData() {
  const [data, tugas, cuti, kasbon, gaji, meetings, documents, absensi] = await Promise.all([
    dashboardData(),
    supabaseAdmin.from('tugas').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('cuti').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('kasbon').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('gaji').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('meetings').select('*').order('tanggal', { ascending: true }).limit(10),
    supabaseAdmin.from('documents').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('absensi').select('*').order('tanggal', { ascending: false }).limit(10)
  ]);

  return {
    metrics: {
      totalKaryawan: data.totalKaryawan,
      tugasPending: data.tugasPending,
      tugasOverdue: data.tugasOverdue,
      cutiPending: data.cutiPending,
      kasbonPending: data.kasbonPending,
      gajiBulanIni: data.gajiBulanIni,
      gajiPaid: data.gajiPaid,
      absensiHariIni: data.absensiHariIni,
      meetingsToday: data.meetingsToday
    },
    smartActions: data.smartActions,
    tugas: compactRows(tugas.data || [], ['id', 'judul', 'prioritas', 'status', 'progress', 'deadline', 'catatan']),
    cuti: compactRows(cuti.data || [], ['id', 'karyawan_id', 'jenis_cuti', 'tanggal_mulai', 'tanggal_selesai', 'jumlah_hari', 'status', 'alasan']),
    kasbon: compactRows(kasbon.data || [], ['id', 'karyawan_id', 'jumlah', 'sisa', 'tanggal_jatuh_tempo', 'status', 'keperluan']),
    gaji: compactRows(gaji.data || [], ['id', 'karyawan_id', 'bulan', 'tahun', 'gaji_bersih', 'status', 'catatan']),
    meetings: compactRows(meetings.data || [], ['id', 'judul', 'agenda', 'tanggal', 'jam_mulai', 'status', 'ringkasan', 'keputusan', 'action_items']),
    documents: compactRows(documents.data || [], ['id', 'nama', 'kategori', 'versi', 'status', 'deskripsi', 'tags']),
    absensi: compactRows(absensi.data || [], ['id', 'karyawan_id', 'tanggal', 'status', 'keterangan'])
  };
}

function modeInstruction(mode: AiMode) {
  const map: Record<AiMode, string> = {
    overview: 'Buat ringkasan kondisi kantor hari ini, angka penting, prioritas admin, dan aksi berikutnya.',
    priority: 'Buat daftar prioritas kerja admin hari ini. Urutkan dari yang paling penting, lengkap dengan alasan dan next action.',
    meeting: 'Ubah catatan meeting menjadi notulen profesional: ringkasan, keputusan, action items, PIC, deadline, dan follow-up.',
    announcement: 'Buat teks pengumuman internal kantor yang jelas, sopan, dan siap dikirim.',
    risk: 'Analisis risiko operasional dari data kantor. Urutkan dari paling penting dan beri solusi.',
    attendance: 'Analisis absensi terbaru, pola hadir/izin/sakit/alpha, dan rekomendasi tindak lanjut HRD.',
    payroll: 'Analisis payroll, status pembayaran gaji, potongan kasbon, dan checklist sebelum paid.',
    document: 'Ringkas dokumen atau catatan menjadi poin penting, risiko, keputusan, dan action items.',
    sop: 'Buat SOP atau memo internal: tujuan, ruang lingkup, langkah kerja, PIC, dan catatan penting.',
    chat: 'Jawab pertanyaan admin berdasarkan data kantor yang tersedia.'
  };
  return map[mode] || map.overview;
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY belum diisi. Tambahkan di .env.local dan Vercel Environment Variables.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const mode = (body.mode || 'overview') as AiMode;
  const prompt = trimText(body.prompt, 2500);
  const notes = trimText(body.notes, 6000);
  const officeData = await getRecentData();

  const instructions = [
    'Kamu adalah Asisten Kantor AI untuk aplikasi manajemen kantor Indonesia.',
    'Gunakan hanya data yang diberikan di OFFICE_DATA dan catatan user. Jangan mengarang angka atau data yang tidak ada.',
    'Jawab dengan bahasa Indonesia yang jelas, rapi, dan mudah dipahami admin non-teknis.',
    'Buat output dengan heading pendek, bullet point, tabel kecil jika perlu, dan langkah aksi konkret.',
    'Kalau data tidak cukup, bilang data belum tersedia dan beri saran data apa yang perlu dilengkapi.'
  ].join('\n');

  const input = [
    `MODE: ${mode}`,
    `TUJUAN MODE: ${modeInstruction(mode)}`,
    `ADMIN: ${user.name} (${user.role})`,
    `PROMPT ADMIN:\n${prompt || modeInstruction(mode)}`,
    `CATATAN TAMBAHAN:\n${notes || '-'}`,
    `OFFICE_DATA JSON:\n${JSON.stringify(officeData, null, 2)}`
  ].join('\n\n');

  const aiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      temperature: 0.3,
      max_output_tokens: 1600
    })
  });

  const payload = await aiResponse.json().catch(() => ({}));
  if (!aiResponse.ok) {
    return NextResponse.json({ error: payload?.error?.message || 'Request OpenAI gagal.' }, { status: aiResponse.status });
  }

  const text = extractOutputText(payload) || 'AI tidak mengembalikan teks.';

  await supabaseAdmin.from('ai_logs').insert({
    user_id: user.id,
    mode,
    prompt,
    notes,
    response: text
  }).then(() => null);

  return NextResponse.json({ text, model });
}
