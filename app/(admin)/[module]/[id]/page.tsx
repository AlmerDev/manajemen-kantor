export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModule } from '@/lib/modules';
import { getLookups, getRow, listRows, relationLabel } from '@/lib/data';
import { publicFileUrl } from '@/lib/supabase';
import { bulanNama, rupiah, tanggal, waktu } from '@/lib/format';
import { quickStatus } from '@/app/actions';

function val(v: any) { return v === null || v === undefined || v === '' ? '—' : String(v); }

function display(field: any, row: any, lookups: any) {
  const v = row[field.name];
  if (field.relation) return relationLabel(v, { table: field.relation.table, key: field.relation.value, label: field.relation.label }, lookups);
  if (field.type === 'number' && /gaji|uang|transport|insentif|bonus|tunjangan|thr|bpjs|potongan|jumlah|sisa|cicilan|tarif/.test(field.name)) return rupiah(v);
  if (field.type === 'date') return tanggal(v);
  if (field.type === 'time') return waktu(v);
  if (field.type === 'file' && v) return <a className="file-link" href={publicFileUrl(v)} target="_blank"><i className="bi bi-box-arrow-up-right" /> Lihat file</a>;
  if (field.type === 'checkbox') return v ? <span className="badge bg-success">Aktif</span> : <span className="badge bg-secondary">Nonaktif</span>;
  return val(v);
}

function prettyStatus(v: any) {
  const value = String(v || '—');
  const ok = ['aktif', 'hadir', 'approved', 'completed', 'paid', 'lunas'].includes(value);
  const warn = ['pending', 'draft', 'in_progress', 'review', 'penting', 'sedang', 'cuti'].includes(value);
  return <span className={`badge status-badge ${ok ? 'bg-success' : warn ? 'bg-warning text-dark' : value === '—' ? 'bg-secondary' : 'bg-danger'}`}>{value.replaceAll('_', ' ')}</span>;
}

async function KaryawanExtra({ id }: { id: string }) {
  const [gaji, kasbon, tugas, absensi] = await Promise.all([listRows('gaji'), listRows('kasbon'), listRows('tugas'), listRows('absensi')]);
  const related = [
    { title: 'Riwayat gaji', icon: 'bi-cash-stack', rows: gaji.filter((x: any) => String(x.karyawan_id) === id).slice(0, 6), fields: ['bulan','tahun','gaji_bersih','status'] },
    { title: 'Kasbon', icon: 'bi-wallet2', rows: kasbon.filter((x: any) => String(x.karyawan_id) === id).slice(0, 5), fields: ['jumlah','sisa','status'] },
    { title: 'Tugas', icon: 'bi-kanban', rows: tugas.filter((x: any) => String(x.karyawan_id) === id).slice(0, 5), fields: ['judul','progress','status'] },
    { title: 'Absensi terbaru', icon: 'bi-calendar-check', rows: absensi.filter((x: any) => String(x.karyawan_id) === id).slice(0, 10), fields: ['tanggal','jam_masuk','status'] }
  ];
  return <div className="related-grid mt-4">{related.map((r) => <div className="card premium-card h-100" key={r.title}><div className="card-header panel-header"><div><span className="eyebrow">Riwayat</span><strong><i className={`bi ${r.icon} me-2`} />{r.title}</strong></div></div><div className="card-body p-0"><table className="table table-sm mb-0 compact-table"><tbody>{r.rows.length ? r.rows.map((row: any) => <tr key={row.id}>{r.fields.map((f) => <td key={f}>{f.includes('gaji') || ['jumlah','sisa'].includes(f) ? rupiah(row[f]) : f === 'tanggal' ? tanggal(row[f]) : f === 'jam_masuk' ? waktu(row[f]) : f === 'status' ? prettyStatus(row[f]) : row[f]}</td>)}</tr>) : <tr><td><div className="empty-state empty-state-sm"><i className="bi bi-inboxes" /><span>Belum ada data.</span></div></td></tr>}</tbody></table></div></div>)}</div>;
}

function SlipGaji({ row, lookups }: any) {
  const karyawan = relationLabel(row.karyawan_id, { table: 'karyawan', key: 'id', label: 'nama' }, lookups);
  const jabatanId = (lookups.karyawan || []).find((k: any) => String(k.id) === String(row.karyawan_id))?.jabatan_id;
  const jabatan = relationLabel(jabatanId, { table: 'jabatan', key: 'id', label: 'nama_jabatan' }, lookups);
  const income = ['gaji_pokok','uang_makan','transport','uang_lain_harian','insentif','bonus','tunjangan','thr','tunjangan_lain'];
  const cut = ['bpjs_kesehatan','bpjs_ketenagakerjaan','potongan_kasbon','potongan_lain'];
  return <div className="slip-box premium-slip"><div className="slip-head"><div><span className="eyebrow">Payroll document</span><h3>Slip Gaji</h3><p>Periode {bulanNama[Number(row.bulan)]} {row.tahun}</p></div>{prettyStatus(row.status)}</div><div className="slip-profile"><div><span>Nama</span><strong>{karyawan}</strong></div><div><span>Jabatan</span><strong>{jabatan}</strong></div><div><span>Gaji bersih</span><strong>{rupiah(row.gaji_bersih)}</strong></div></div><div className="attendance-strip"><div><span>Hadir</span><strong>{row.total_hadir || 0}</strong></div><div><span>Izin</span><strong>{row.total_izin || 0}</strong></div><div><span>Sakit</span><strong>{row.total_sakit || 0}</strong></div><div><span>Alpha</span><strong>{row.total_alpha || 0}</strong></div><div><span>Cuti</span><strong>{row.total_cuti || 0}</strong></div></div><div className="row g-4"><div className="col-md-6"><div className="salary-panel salary-in"><h6>Pendapatan</h6>{income.map((f) => <div className="salary-row" key={f}><span>{f.replaceAll('_',' ')}</span><strong>{rupiah(row[f])}</strong></div>)}</div></div><div className="col-md-6"><div className="salary-panel salary-out"><h6>Potongan</h6>{cut.map((f) => <div className="salary-row" key={f}><span>{f.replaceAll('_',' ')}</span><strong>{rupiah(row[f])}</strong></div>)}</div></div></div><div className="slip-total"><span>Total diterima</span><strong>{rupiah(row.gaji_bersih)}</strong></div><div className="mt-3"><Link href={`/export/gaji/pdf?id=${row.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-danger"><i className="bi bi-file-earmark-pdf" /> Preview PDF</Link></div></div>;
}

function DetailHero({ config, row }: any) {
  const status = row.status || row.prioritas || (row.is_active !== undefined ? (row.is_active ? 'aktif' : 'nonaktif') : null);
  return (
    <section className="detail-hero mb-4">
      <div className="detail-hero-main">
        <div className="module-hero-icon"><i className={`bi ${config.icon}`} /></div>
        <div>
          <span className="eyebrow">Detail data</span>
          <h1>{config.single}</h1>
          <p>{config.description}</p>
        </div>
      </div>
      <div className="detail-hero-actions">
        {status ? prettyStatus(status) : null}
        <Link href={`/${config.slug}`} className="btn btn-light border"><i className="bi bi-arrow-left" /> Kembali</Link>
        {config.canEdit ? <Link href={`/${config.slug}/${row.id}/edit`} className="btn btn-primary"><i className="bi bi-pencil-square" /> Edit</Link> : null}
      </div>
    </section>
  );
}

export default async function DetailPage({ params }: { params: { module: string; id: string } }) {
  const config = getModule(params.module);
  if (!config || !config.canShow) notFound();
  const [row, lookups] = await Promise.all([getRow(config.table, params.id), getLookups()]);
  if (!row) notFound();
  if (config.slug === 'gaji') {
    return <><div className="detail-hero mb-4"><div className="detail-hero-main"><div className="module-hero-icon"><i className="bi bi-receipt" /></div><div><span className="eyebrow">Detail payroll</span><h1>Slip Gaji</h1><p>Lembar slip gaji siap cetak dan export PDF.</p></div></div><Link href="/gaji" className="btn btn-light border"><i className="bi bi-arrow-left" /> Kembali</Link></div><SlipGaji row={row} lookups={lookups} /></>;
  }
  return (
    <>
      <DetailHero config={config} row={row} />
      <div className="card detail-card premium-card">
        <div className="card-header panel-header"><div><span className="eyebrow">Informasi lengkap</span><strong>Data {config.single}</strong></div><span className="badge bg-secondary">ID #{row.id}</span></div>
        <div className="card-body"><div className="detail-grid">{config.fields.map((field) => <div className={field.type === 'textarea' ? 'detail-tile detail-tile-wide' : 'detail-tile'} key={field.name}><span>{field.label}</span><strong>{display(field, row, lookups)}</strong></div>)}</div></div>
      </div>
      {config.slug === 'cuti' && row.status === 'pending' ? <div className="approval-panel mt-4"><div><span className="eyebrow">Persetujuan cuti</span><h3>Butuh keputusan admin</h3><p>Isi catatan singkat sebelum menyetujui atau menolak pengajuan.</p></div><div className="approval-actions"><form action={quickStatus.bind(null, 'cuti', String(row.id), 'approved')} data-loading-text="Menyetujui cuti..."><input type="hidden" name="_returnTo" value="/cuti" /><textarea name="catatan_admin" className="form-control mb-2" placeholder="Catatan admin (opsional)" /><button className="btn btn-success"><i className="bi bi-check2-circle" /> Setujui</button></form><form action={quickStatus.bind(null, 'cuti', String(row.id), 'rejected')} data-confirm="Tolak pengajuan cuti ini?" data-loading-text="Menolak cuti..."><input type="hidden" name="_returnTo" value="/cuti" /><textarea name="catatan_admin" className="form-control mb-2" placeholder="Catatan wajib saat ditolak" required /><button className="btn btn-danger"><i className="bi bi-x-octagon" /> Tolak</button></form></div></div> : null}
      {config.slug === 'karyawan' ? <KaryawanExtra id={String(row.id)} /> : null}
    </>
  );
}
