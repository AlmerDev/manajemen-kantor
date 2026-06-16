export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import Link from 'next/link';
import DashboardCharts from '@/components/DashboardCharts';
import { dashboardData } from '@/lib/data';
import { modules } from '@/lib/modules';
import { rupiah, tanggal } from '@/lib/format';

function StatCard({ title, value, subtitle, icon, tone = 'blue' }: any) {
  return (
    <div className="col-sm-6 col-xxl-3">
      <div className={`stat-card pro-stat-card tone-${tone} h-100`}>
        <span className="stat-icon"><i className={`bi ${icon}`} /></span>
        <div className="min-w-0">
          <p>{title}</p>
          <h3>{value}</h3>
          {subtitle ? <small>{subtitle}</small> : null}
        </div>
      </div>
    </div>
  );
}

function ActionList({ actions }: { actions: string[] }) {
  const links = ['/cuti', '/kasbon', '/tugas', '/gaji'];
  return (
    <div className="pro-panel h-100">
      <div className="pro-panel-head">
        <div>
          <span className="eyebrow">Tindak lanjut</span>
          <h2>Yang perlu dicek</h2>
        </div>
        <span className="panel-count">{actions.length}</span>
      </div>
      <div className="pro-action-list">
        {actions.map((a, i) => (
          <Link href={links[i] || '/dashboard'} key={a} className="pro-action-item">
            <span className="pro-action-number">{String(i + 1).padStart(2, '0')}</span>
            <strong>{a}</strong>
            <i className="bi bi-chevron-right" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function AnnouncementPanel({ items }: { items: any[] }) {
  return (
    <div className="pro-panel h-100">
      <div className="pro-panel-head">
        <div>
          <span className="eyebrow">Pengumuman</span>
          <h2>Informasi internal</h2>
        </div>
        <Link href="/pengumuman" className="btn btn-sm btn-soft-primary">Kelola</Link>
      </div>
      <div className="pro-announcement-list">
        {items.length ? items.slice(0, 3).map((p: any) => (
          <div className="pro-announcement-item" key={p.id}>
            <span className={`priority-dot priority-${p.prioritas || 'normal'}`} />
            <div className="min-w-0">
              <strong>{p.judul}</strong>
              <p>{String(p.isi || '').slice(0, 120)}</p>
            </div>
            <small>{tanggal(p.created_at)}</small>
          </div>
        )) : <div className="empty-state small-empty"><i className="bi bi-megaphone" /><strong>Belum ada pengumuman</strong><span>Informasi internal akan tampil di sini.</span></div>}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await dashboardData();
  const shortcuts = modules.filter((m) => ['karyawan', 'jabatan', 'tugas', 'absensi', 'cuti', 'pengumuman', 'gaji', 'kasbon'].includes(m.slug));
  return (
    <div className="dashboard-pro-layout">
      <section className="dashboard-hero-clean mb-4">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">Dashboard operasional</span>
          <h1>Ringkasan kantor</h1>
          <p>Kelola data karyawan, tugas, absensi, cuti, pengumuman, penggajian, dan kasbon dalam tampilan yang lebih sederhana.</p>
        </div>
        <div className="dashboard-date-card">
          <i className="bi bi-calendar2-week" />
          <div>
            <strong>{new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</strong>
            <span>{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </section>

      <div className="quick-module-bar mb-4">
        {shortcuts.map((m) => (
          <Link href={`/${m.slug}`} className="quick-module-chip" key={m.slug}>
            <i className={`bi ${m.icon}`} />
            <span>{m.title}</span>
          </Link>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <StatCard title="Karyawan aktif" value={data.totalKaryawan} subtitle={`${data.totalKaryawanAll} total karyawan`} icon="bi-people" tone="blue" />
        <StatCard title="Tugas berjalan" value={data.tugasPending} subtitle={`${data.tugasSelesai} selesai bulan ini`} icon="bi-kanban" tone="violet" />
        <StatCard title="Gaji bulan ini" value={rupiah(data.gajiBulanIni)} subtitle={`${data.gajiPaid} sudah dibayar`} icon="bi-cash-stack" tone="green" />
        <StatCard title="Kasbon aktif" value={rupiah(data.totalKasbonAktif)} subtitle={`${data.kasbonPending} pengajuan pending`} icon="bi-wallet2" tone="amber" />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-xxl-7">
          <div className="pro-panel h-100">
            <div className="pro-panel-head">
              <div>
                <span className="eyebrow">Kontrol harian</span>
                <h2>Status operasional</h2>
              </div>
            </div>
            <div className="operational-grid">
              <div><strong>{data.absensiHariIni}</strong><span>Hadir hari ini</span></div>
              <div><strong>{data.cutiPending}</strong><span>Cuti pending</span></div>
              <div><strong>{data.kasbonPending}</strong><span>Kasbon pending</span></div>
              <div><strong>{data.tugasOverdue}</strong><span>Tugas overdue</span></div>
            </div>
          </div>
        </div>
        <div className="col-xxl-5"><ActionList actions={data.smartActions} /></div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-xxl-5"><AnnouncementPanel items={data.pengumuman} /></div>
        <div className="col-xxl-7">
          <div className="pro-panel data-panel h-100">
            <div className="pro-panel-head">
              <div>
                <span className="eyebrow">Daftar kerja</span>
                <h2>Tugas terbaru</h2>
              </div>
              <Link href="/tugas" className="btn btn-sm btn-soft-primary">Semua tugas</Link>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0 admin-table dashboard-task-table">
                <thead><tr><th>Judul</th><th>Penanggung jawab</th><th>Deadline</th><th>Status</th></tr></thead>
                <tbody>
                  {data.tugasTerbaru.length ? data.tugasTerbaru.slice(0, 5).map((t: any) => (
                    <tr key={t.id}>
                      <td><div className="table-primary-value">{t.judul}</div><small className="text-muted">{String(t.deskripsi || '').slice(0, 72)}</small></td>
                      <td>{t.karyawan_nama}</td>
                      <td><span className="date-cell">{tanggal(t.deadline)}</span></td>
                      <td><span className="badge bg-secondary">{String(t.status || '').replaceAll('_', ' ')}</span></td>
                    </tr>
                  )) : <tr><td colSpan={4}><div className="empty-state"><i className="bi bi-inboxes" /><strong>Belum ada tugas</strong><span>Data tugas terbaru akan muncul di sini.</span></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <DashboardCharts grafikGaji={data.grafikGaji} grafikTugas={data.grafikTugas} />
    </div>
  );
}
