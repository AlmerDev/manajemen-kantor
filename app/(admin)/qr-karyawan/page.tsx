export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export default async function QrKaryawanPage() {
  const { data: karyawan, error } = await supabaseAdmin
    .from('karyawan')
    .select('id,nip,nama,departemen,status,email')
    .order('nama', { ascending: true });

  const rows = karyawan || [];

  return (
    <div className="qr-admin-page">
      <section className="module-hero mb-4 qr-admin-hero">
        <div className="module-hero-main">
          <div className="module-hero-icon"><i className="bi bi-qr-code-scan" /></div>
          <div>
            <span className="eyebrow">Absensi QR</span>
            <h1>QR Karyawan</h1>
            <p>Generate, preview, dan download QR absensi untuk setiap karyawan. QR ini dipakai di halaman scan kamera.</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <Link href="/scan-absen" target="_blank" rel="noopener noreferrer" className="btn btn-primary"><i className="bi bi-camera" /> Buka Halaman Scan</Link>
          <Link href="/absensi" className="btn btn-light border"><i className="bi bi-calendar-check" /> Lihat Absensi</Link>
        </div>
        <div className="module-hero-metrics">
          <div><span>Total QR</span><strong>{rows.length}</strong></div>
          <div><span>Karyawan aktif</span><strong>{rows.filter((x: any) => x.status === 'aktif').length}</strong></div>
          <div><span>Mode</span><strong>Realtime</strong></div>
        </div>
      </section>

      {error ? <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2" />{error.message}</div> : null}

      <div className="qr-guide-panel mb-4">
        <div><i className="bi bi-info-circle" /></div>
        <p><strong>Cara pakai:</strong> download QR karyawan, tempel di ID card/kartu absensi, lalu buka halaman scan. Saat QR discan, data langsung masuk ke Absensi Harian dan rekap Absensi Bulanan ikut diperbarui.</p>
      </div>

      <div className="qr-card-grid">
        {rows.map((item: any) => (
          <article className={`qr-employee-card ${item.status !== 'aktif' ? 'is-muted' : ''}`} key={item.id}>
            <div className="qr-employee-top">
              <div className="qr-avatar">{String(item.nama || '?').slice(0, 2).toUpperCase()}</div>
              <div>
                <h2>{item.nama}</h2>
                <p>{item.nip || `ID-${item.id}`} · {item.departemen || 'Tanpa departemen'}</p>
              </div>
              <span className={`qr-status ${item.status === 'aktif' ? 'active' : 'inactive'}`}>{item.status}</span>
            </div>

            <div className="qr-preview-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/karyawan/${item.id}`} alt={`QR absensi ${item.nama}`} loading="lazy" />
            </div>

            <div className="qr-card-actions">
              <a href={`/api/qr/karyawan/${item.id}?format=png&download=1`} className="btn btn-primary btn-sm"><i className="bi bi-download" /> Download PNG</a>
              <a href={`/api/qr/karyawan/${item.id}?download=1`} className="btn btn-light border btn-sm"><i className="bi bi-filetype-svg" /> SVG</a>
            </div>
          </article>
        ))}
        {!rows.length ? (
          <div className="empty-state"><i className="bi bi-qr-code" /><strong>Belum ada karyawan</strong><span>Tambah data karyawan dulu supaya QR bisa dibuat.</span></div>
        ) : null}
      </div>
    </div>
  );
}
