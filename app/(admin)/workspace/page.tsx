export const dynamic = 'force-dynamic';

import Link from 'next/link';
import AiWorkspaceClient from '@/components/AiWorkspaceClient';
import { dashboardData } from '@/lib/data';
import { tanggal, waktu } from '@/lib/format';

export default async function WorkspacePage() {
  const data = await dashboardData();
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY);
  const defaultNotes = [
    `Data hari ini: ${data.meetingsToday} meeting, ${data.cutiPending} cuti pending, ${data.kasbonPending} kasbon pending, ${data.tugasOverdue} tugas overdue.`,
    `Payroll bulan ini: ${data.gajiPaid} slip sudah dibayar.`,
    `Absensi hadir hari ini: ${data.absensiHariIni}.`,
    `Dokumen terbaru tersimpan: ${data.recentDocuments.length}.`,
    `Prioritas otomatis: ${data.smartActions.join(' | ')}`
  ].join('\n');

  return (
    <>
      <section className="office-page-head mb-4">
        <div className="office-page-title">
          <span className="office-page-icon"><i className="bi bi-cpu" /></span>
          <div>
            <span className="eyebrow">Asisten AI</span>
            <h1>Asisten kantor yang gampang dipahami</h1>
            <p>Pilih fitur, tulis perintah, jalankan AI, lalu hasilnya bisa langsung dicopy. Tidak ada panel kosong dan tidak ada output palsu.</p>
          </div>
        </div>
        <div className="office-page-actions">
          <Link href="/documents" className="btn btn-light border"><i className="bi bi-folder2-open" /> File Manager</Link>
          <Link href="/meetings/create" className="btn btn-primary"><i className="bi bi-calendar2-plus" /> Buat Meeting</Link>
        </div>
      </section>

      <section className="office-stats-grid mb-4">
        <div><i className="bi bi-calendar-event" /><span>Meeting hari ini</span><strong>{data.meetingsToday}</strong></div>
        <div><i className="bi bi-hourglass-split" /><span>Approval pending</span><strong>{data.cutiPending + data.kasbonPending}</strong></div>
        <div><i className="bi bi-alarm" /><span>Tugas overdue</span><strong>{data.tugasOverdue}</strong></div>
        <div><i className="bi bi-folder2-open" /><span>Dokumen aktif</span><strong>{data.recentDocuments.length}</strong></div>
        <div><i className="bi bi-person-check" /><span>Hadir hari ini</span><strong>{data.absensiHariIni}</strong></div>
      </section>

      <AiWorkspaceClient
        aiEnabled={aiEnabled}
        defaultNotes={defaultNotes}
        context={{
          pendingCuti: data.cutiPending,
          pendingKasbon: data.kasbonPending,
          tugasOverdue: data.tugasOverdue,
          meetingsToday: data.meetingsToday,
          documentsCount: data.recentDocuments.length,
          gajiPaid: data.gajiPaid,
          absensiHariIni: data.absensiHariIni
        }}
      />

      <section className="office-two-grid mt-4">
        <div className="office-simple-card">
          <div className="office-panel-head">
            <div><span className="eyebrow">Meeting</span><h2>Agenda terdekat</h2></div>
            <Link href="/meetings" className="btn btn-sm btn-light border">Lihat semua</Link>
          </div>
          <div className="meeting-stack">
            {data.upcomingMeetings.length ? data.upcomingMeetings.map((m: any) => (
              <Link href={`/meetings/${m.id}`} className="meeting-card" key={m.id}>
                <span className="meeting-time">{waktu(m.jam_mulai) || '—'}</span>
                <div><strong>{m.judul}</strong><small>{tanggal(m.tanggal)} · {m.owner_nama}</small></div>
                <i className="bi bi-chevron-right ms-auto" />
              </Link>
            )) : <div className="empty-state empty-state-sm"><i className="bi bi-calendar2-plus" /><span>Belum ada meeting berikutnya.</span></div>}
          </div>
        </div>
        <div className="office-simple-card">
          <div className="office-panel-head">
            <div><span className="eyebrow">Dokumen</span><h2>File kerja terbaru</h2></div>
            <Link href="/documents" className="btn btn-sm btn-light border">Buka file manager</Link>
          </div>
          <div className="file-stack">
            {data.recentDocuments.length ? data.recentDocuments.map((f: any) => (
              <Link href={`/documents/${f.id}`} className="file-row" key={f.id}>
                <span className="file-icon"><i className="bi bi-file-earmark-text" /></span>
                <div><strong>{f.nama}</strong><small>{f.kategori} · {f.owner_nama}</small></div>
                <span className="file-version">{f.versi || 'v1'}</span>
              </Link>
            )) : <div className="empty-state empty-state-sm"><i className="bi bi-folder2-open" /><span>Belum ada dokumen.</span></div>}
          </div>
        </div>
      </section>
    </>
  );
}
