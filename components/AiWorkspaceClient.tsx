'use client';

import { useMemo, useState } from 'react';

type AiMode =
  | 'overview'
  | 'priority'
  | 'meeting'
  | 'announcement'
  | 'risk'
  | 'attendance'
  | 'payroll'
  | 'document'
  | 'sop'
  | 'chat';

type Props = {
  aiEnabled: boolean;
  defaultNotes: string;
  context: {
    pendingCuti: number;
    pendingKasbon: number;
    tugasOverdue: number;
    meetingsToday: number;
    documentsCount: number;
    gajiPaid: number;
    absensiHariIni: number;
  };
};

const modes: Array<{
  id: AiMode;
  title: string;
  short: string;
  icon: string;
  prompt: string;
  placeholder: string;
  badge?: string;
}> = [
  {
    id: 'overview',
    title: 'Ringkasan kantor',
    short: 'Kondisi kantor hari ini',
    icon: 'bi-speedometer2',
    prompt: 'Buat ringkasan kondisi kantor hari ini. Jelaskan angka penting, masalah yang perlu dicek, dan aksi cepat untuk admin.',
    placeholder: 'Tambahkan catatan khusus kalau ada. Contoh: fokuskan ke tugas HRD dan payroll bulan ini.',
    badge: 'Utama'
  },
  {
    id: 'priority',
    title: 'Prioritas kerja',
    short: 'Urutan pekerjaan admin',
    icon: 'bi-list-check',
    prompt: 'Buat daftar prioritas kerja admin hari ini berdasarkan data kantor. Urutkan dari paling penting, berikan alasan dan deadline saran.',
    placeholder: 'Contoh: saya cuma punya waktu 2 jam, pilihkan yang paling penting dulu.'
  },
  {
    id: 'meeting',
    title: 'Notulen meeting',
    short: 'Catatan jadi rapi',
    icon: 'bi-camera-video',
    prompt: 'Ubah catatan meeting ini menjadi notulen profesional: ringkasan, keputusan, action items, PIC, deadline, dan follow-up.',
    placeholder: 'Tempel catatan meeting di sini. Contoh: payroll dicek Dewi, kasbon diputuskan Ahmad, deadline Jumat.'
  },
  {
    id: 'announcement',
    title: 'Pengumuman',
    short: 'Teks siap kirim',
    icon: 'bi-megaphone',
    prompt: 'Buat pengumuman internal kantor yang jelas, sopan, singkat, dan siap dikirim ke karyawan.',
    placeholder: 'Contoh: pengumuman validasi data rekening sebelum payroll tanggal 25.'
  },
  {
    id: 'risk',
    title: 'Cek risiko',
    short: 'Masalah operasional',
    icon: 'bi-shield-exclamation',
    prompt: 'Analisis risiko operasional dari data kantor dan catatan tambahan. Urutkan dari paling penting, beri alasan, dampak, dan solusi singkat.',
    placeholder: 'Contoh: cek absensi, cuti pending, tugas overdue, kasbon pending, dan payroll belum paid.'
  },
  {
    id: 'attendance',
    title: 'Analisis absensi',
    short: 'Kehadiran & pola',
    icon: 'bi-calendar-check',
    prompt: 'Analisis data absensi terbaru. Beri ringkasan kehadiran, anomali yang perlu dicek, dan rekomendasi tindak lanjut HRD.',
    placeholder: 'Contoh: cari karyawan yang sering izin/sakit/alpha dan buat saran follow-up.'
  },
  {
    id: 'payroll',
    title: 'Cek payroll',
    short: 'Gaji & kasbon',
    icon: 'bi-cash-stack',
    prompt: 'Analisis payroll dan kasbon. Jelaskan status gaji bulan ini, potongan kasbon, risiko pembayaran, dan checklist sebelum paid.',
    placeholder: 'Contoh: bantu cek apakah payroll bulan ini sudah aman untuk dibayar.'
  },
  {
    id: 'document',
    title: 'Ringkas dokumen',
    short: 'Summary file/catatan',
    icon: 'bi-file-earmark-text',
    prompt: 'Ringkas isi dokumen/catatan berikut menjadi poin penting, keputusan, risiko, dan langkah lanjutan.',
    placeholder: 'Tempel isi dokumen atau deskripsi file di sini. Untuk PDF/DOCX, copy teksnya dulu ke sini.'
  },
  {
    id: 'sop',
    title: 'Buat SOP / Memo',
    short: 'Draft prosedur kerja',
    icon: 'bi-journal-text',
    prompt: 'Buat SOP atau memo internal kantor yang rapi dari kebutuhan berikut: tujuan, ruang lingkup, langkah kerja, PIC, dan catatan penting.',
    placeholder: 'Contoh: SOP pengajuan cuti, SOP approval kasbon, atau memo lembur.'
  },
  {
    id: 'chat',
    title: 'Tanya AI',
    short: 'Tanya bebas soal kantor',
    icon: 'bi-chat-dots',
    prompt: 'Jawab pertanyaan admin berdasarkan data kantor yang tersedia. Kalau data tidak ada, katakan dengan jujur.',
    placeholder: 'Contoh: apa yang harus saya bereskan dulu hari ini?'
  }
];

const quickPrompts = [
  'Apa 3 pekerjaan paling penting hari ini?',
  'Buat checklist sebelum payroll dibayar.',
  'Cari risiko dari cuti, kasbon, tugas, payroll, dan absensi.',
  'Buat pesan WhatsApp singkat untuk karyawan update data.',
  'Ubah catatan saya jadi notulen meeting.'
];

function modeById(id: AiMode) {
  return modes.find((item) => item.id === id) || modes[0];
}

function formatError(message: string) {
  if (message.includes('OPENAI_API_KEY')) return 'AI belum aktif. Isi OPENAI_API_KEY di .env.local / Vercel Environment Variables, lalu restart server.';
  return message || 'AI gagal dijalankan.';
}

export default function AiWorkspaceClient({ aiEnabled, defaultNotes, context }: Props) {
  const [mode, setMode] = useState<AiMode>('overview');
  const activeMode = useMemo(() => modeById(mode), [mode]);
  const [prompt, setPrompt] = useState(activeMode.prompt);
  const [notes, setNotes] = useState(defaultNotes);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function chooseMode(next: AiMode) {
    const item = modeById(next);
    setMode(next);
    setPrompt(item.prompt);
    if (['overview', 'priority', 'risk', 'payroll', 'attendance'].includes(next)) {
      setNotes(defaultNotes);
    } else if (notes === defaultNotes) {
      setNotes('');
    }
    setError('');
  }

  async function runAi() {
    setError('');
    setResult('');

    if (!aiEnabled) {
      setError('AI belum aktif. Isi OPENAI_API_KEY di .env.local dan Vercel Environment Variables, lalu restart npm run dev.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, prompt, notes })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'AI gagal dijalankan.');
      setResult(json.text || 'AI tidak mengembalikan jawaban.');
    } catch (err: any) {
      setError(formatError(err?.message || 'AI gagal dijalankan.'));
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  }

  return (
    <section className="office-ai-layout">
      <aside className="office-ai-tools">
        <div className="office-panel-head">
          <div>
            <span className="eyebrow">Fitur AI</span>
            <h2>Pilih bantuan</h2>
          </div>
          <span className={`office-ai-state ${aiEnabled ? 'ready' : 'warning'}`}>{aiEnabled ? 'Aktif' : 'Belum aktif'}</span>
        </div>

        <div className="office-ai-menu">
          {modes.map((item) => (
            <button type="button" key={item.id} onClick={() => chooseMode(item.id)} className={`office-ai-menu-item ${mode === item.id ? 'active' : ''}`}>
              <span className="office-ai-menu-icon"><i className={`bi ${item.icon}`} /></span>
              <span className="office-ai-menu-text">
                <strong>{item.title}</strong>
                <small>{item.short}</small>
              </span>
              {item.badge ? <em>{item.badge}</em> : null}
            </button>
          ))}
        </div>
      </aside>

      <main className="office-ai-main">
        <div className="office-ai-command-card">
          <div className="office-panel-head align-start">
            <div>
              <span className="eyebrow">Input</span>
              <h2>{activeMode.title}</h2>
              <p>{activeMode.short}. Tulis perintahnya di bawah, lalu klik Jalankan AI.</p>
            </div>
            <button type="button" className="btn btn-primary office-ai-run" onClick={runAi} disabled={loading || !aiEnabled}>
              {loading ? <><span className="spinner-border spinner-border-sm" /> Memproses</> : <><i className="bi bi-send" /> Jalankan AI</>}
            </button>
          </div>

          <div className="office-quick-prompts" aria-label="Template perintah cepat">
            {quickPrompts.map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}>{item}</button>)}
          </div>

          <div className="row g-3">
            <div className="col-xl-6">
              <label className="form-label" htmlFor="aiPrompt">Perintah utama</label>
              <textarea id="aiPrompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="form-control office-ai-textarea" />
            </div>
            <div className="col-xl-6">
              <label className="form-label" htmlFor="aiNotes">Data / catatan tambahan</label>
              <textarea id="aiNotes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control office-ai-textarea" placeholder={activeMode.placeholder} />
            </div>
          </div>

          <div className="office-ai-actions">
            <button type="button" onClick={() => setNotes(defaultNotes)}>Pakai data hari ini</button>
            <button type="button" onClick={() => setNotes('')}>Kosongkan catatan</button>
            <button type="button" onClick={() => setPrompt(activeMode.prompt)}>Reset perintah</button>
          </div>
        </div>

        <div className="office-ai-result-card">
          <div className="office-panel-head">
            <div>
              <span className="eyebrow">Output</span>
              <h2>Hasil AI</h2>
            </div>
            <button type="button" className="btn btn-light border" onClick={copyResult} disabled={!result}><i className="bi bi-copy" /> Copy</button>
          </div>

          {error ? <div className="office-ai-error"><i className="bi bi-info-circle" /> {error}</div> : null}
          {result ? (
            <pre className="office-ai-result-text">{result}</pre>
          ) : (
            <div className="office-ai-empty">
              <i className="bi bi-stars" />
              <strong>Belum ada hasil</strong>
              <span>Pilih fitur, tulis perintah, lalu klik Jalankan AI. Output akan muncul di sini.</span>
            </div>
          )}
        </div>
      </main>

      <aside className="office-ai-side">
        <div className="office-ai-context-card">
          <div className="office-panel-head">
            <div>
              <span className="eyebrow">Data terbaca</span>
              <h2>Konteks Supabase</h2>
            </div>
          </div>
          <div className="office-context-list">
            <div><span>Cuti pending</span><strong>{context.pendingCuti}</strong></div>
            <div><span>Kasbon pending</span><strong>{context.pendingKasbon}</strong></div>
            <div><span>Tugas overdue</span><strong>{context.tugasOverdue}</strong></div>
            <div><span>Meeting hari ini</span><strong>{context.meetingsToday}</strong></div>
            <div><span>Dokumen</span><strong>{context.documentsCount}</strong></div>
            <div><span>Absensi hadir</span><strong>{context.absensiHariIni}</strong></div>
          </div>
        </div>

        <div className={`office-ai-key-card ${aiEnabled ? 'ready' : 'warning'}`}>
          <i className={`bi ${aiEnabled ? 'bi-shield-check' : 'bi-key'}`} />
          <div>
            <strong>{aiEnabled ? 'API key aman' : 'OpenAI belum disambungkan'}</strong>
            <p>{aiEnabled ? 'Key tetap di server. Browser cuma mengirim perintah ke route internal.' : 'Isi OPENAI_API_KEY di .env.local, lalu restart npm run dev.'}</p>
            {!aiEnabled ? <code>OPENAI_API_KEY=sk-...</code> : null}
          </div>
        </div>
      </aside>
    </section>
  );
}
