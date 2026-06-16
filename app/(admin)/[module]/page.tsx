export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteRecord, generateBulkGaji, generateAbsensiBulanan, quickStatus, togglePengumuman, bulkAbsensi } from '@/app/actions';
import { getModule, statusOptions, monthOptions } from '@/lib/modules';
import { moduleRows, relationLabel } from '@/lib/data';
import { bulanNama, rupiah, tanggal, waktu, todayISO } from '@/lib/format';

function badgeClass(v: string) {
  if (['aktif', 'hadir', 'approved', 'completed', 'paid', 'lunas'].includes(v)) return 'bg-success';
  if (['pending', 'draft', 'in_progress', 'review', 'penting', 'sedang', 'izin', 'sakit', 'cuti'].includes(v)) return 'bg-warning text-dark';
  if (['rejected', 'cancelled', 'urgent', 'alpha', 'nonaktif'].includes(v)) return 'bg-danger';
  return 'bg-secondary';
}

function niceLabel(v: unknown) {
  return String(v || '—').replaceAll('_', ' ');
}

function renderCell(row: any, col: any, lookups: Record<string, any[]>, index = 0) {
  const value = col.relation ? relationLabel(row[col.key], col.relation, lookups) : row[col.key];
  if (col.type === 'money') return <span className="money-cell">{rupiah(value)}</span>;
  if (col.type === 'date') return <span className="date-cell">{tanggal(value)}</span>;
  if (col.type === 'time') return waktu(value);
  if (col.type === 'boolean') return value ? <span className="badge bg-success">Aktif</span> : <span className="badge bg-secondary">Nonaktif</span>;
  if (col.type === 'status') return <span className={`badge status-badge ${badgeClass(String(value))}`}>{niceLabel(value)}</span>;
  if (col.type === 'progress') return <div className="progress smart-progress" style={{ width: 124 }}><div className="progress-bar" style={{ width: `${Number(value || 0)}%` }}>{Number(value || 0)}%</div></div>;
  if (col.type === 'month') return <span className="date-cell">{bulanNama[Number(row.bulan)] || row.bulan} {row.tahun}</span>;
  if (index === 0) return <span className="table-primary-value">{value || '—'}</span>;
  return value || '—';
}

function messageBox(searchParams: any) {
  return <>{searchParams.success ? <div className="alert alert-success alert-auto"><i className="bi bi-check-circle me-2" />{searchParams.success}</div> : null}{searchParams.error ? <div className="alert alert-danger alert-auto"><i className="bi bi-exclamation-triangle me-2" />{searchParams.error}</div> : null}</>;
}

function HiddenReturn({ returnTo }: { returnTo: string }) {
  return <input type="hidden" name="_returnTo" value={returnTo} />;
}

function QuickActions({ module, row, returnTo }: any) {
  if (module === 'gaji') return <>
    {row.status === 'draft' ? <form action={quickStatus.bind(null, 'gaji', String(row.id), 'approved')} data-loading-text="Meng-approve gaji..."><HiddenReturn returnTo={returnTo} /><button className="action-btn action-approve"><i className="bi bi-check2-circle" /> Approve</button></form> : null}
    {row.status === 'approved' ? <form action={quickStatus.bind(null, 'gaji', String(row.id), 'paid')} data-confirm="Tandai gaji ini dibayar? Sisa kasbon karyawan akan otomatis dipotong sesuai nominal potongan kasbon di slip." data-loading-text="Memproses pembayaran..."><HiddenReturn returnTo={returnTo} /><button className="action-btn action-paid"><i className="bi bi-cash-coin" /> Bayar</button></form> : null}
    <Link className="action-btn action-view" href={`/gaji/${row.id}`} target="_blank" rel="noopener noreferrer"><i className="bi bi-receipt" /> Slip</Link>
  </>;
  if (module === 'kasbon') return <>
    {row.status === 'pending' ? <form action={quickStatus.bind(null, 'kasbon', String(row.id), 'approved')} data-loading-text="Menyetujui kasbon..."><HiddenReturn returnTo={returnTo} /><button className="action-btn action-approve"><i className="bi bi-check2" /> Approve</button></form> : null}
    {row.status === 'pending' ? <form action={quickStatus.bind(null, 'kasbon', String(row.id), 'rejected')} data-confirm="Tolak pengajuan kasbon ini?" data-loading-text="Menolak kasbon..."><HiddenReturn returnTo={returnTo} /><button className="action-btn action-reject"><i className="bi bi-x-lg" /> Reject</button></form> : null}
  </>;
  if (module === 'cuti') return <>
    {row.status === 'pending' ? <form action={quickStatus.bind(null, 'cuti', String(row.id), 'approved')} data-loading-text="Menyetujui cuti..."><HiddenReturn returnTo={returnTo} /><button className="action-btn action-approve"><i className="bi bi-check2" /> Approve</button></form> : null}
    {row.status === 'pending' ? <form action={quickStatus.bind(null, 'cuti', String(row.id), 'rejected')} data-confirm="Tolak pengajuan cuti ini?" data-loading-text="Menolak cuti..."><HiddenReturn returnTo={returnTo} /><button className="action-btn action-reject"><i className="bi bi-x-lg" /> Reject</button></form> : null}
  </>;
  if (module === 'pengumuman') return <form action={togglePengumuman.bind(null, String(row.id))} data-loading-text={row.is_active ? 'Menonaktifkan...' : 'Mengaktifkan...'}><HiddenReturn returnTo={returnTo} /><button className={`publish-switch ${row.is_active ? 'is-on' : 'is-off'}`} title={row.is_active ? 'Nonaktifkan pengumuman' : 'Aktifkan pengumuman'}><span className="switch-track"><i /></span><span>{row.is_active ? 'Aktif' : 'Nonaktif'}</span></button></form>;
  return null;
}

function ModuleTools({ config, rows, bulan, tahun, lookups, returnTo }: any) {
  if (config.slug === 'gaji') {
    return (
      <div className="utility-panel mb-4">
        <div className="utility-icon"><i className="bi bi-stars" /></div>
        <div className="utility-copy">
          <strong>Generate payroll massal</strong>
          <span>Buat draft gaji karyawan aktif untuk periode tertentu.</span>
        </div>
        <form action={generateBulkGaji} className="utility-form" data-loading-text="Generate payroll..."><HiddenReturn returnTo={returnTo} />
          <div><label className="form-label small mb-1">Bulan</label><select name="bulan" defaultValue={String(bulan)} className="form-select form-select-sm">{monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div><label className="form-label small mb-1">Tahun</label><input name="tahun" type="number" min="2020" defaultValue={tahun} className="form-control form-control-sm" /></div>
          <button className="btn btn-dark btn-sm"><i className="bi bi-magic" /> Generate</button>
        </form>
        <div className="utility-total">Total bersih <strong>{rupiah(rows.reduce((s: number, r: any) => s + Number(r.gaji_bersih || 0), 0))}</strong></div>
      </div>
    );
  }
  if (config.slug === 'absensi') {
    const karyawan = (lookups.karyawan || []).filter((k: any) => k.status === 'aktif');
    return (
      <div className="card premium-card mb-4">
        <div className="card-header panel-header"><div><span className="eyebrow">Quick input</span><strong><i className="bi bi-calendar-plus me-2" />Absensi massal</strong></div><div className="d-flex flex-wrap gap-2 align-items-center"><small>{karyawan.length} karyawan aktif</small><Link href="/qr-karyawan" className="btn btn-light border btn-sm"><i className="bi bi-qr-code-scan" /> QR Karyawan</Link><Link href="/scan-absen" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm"><i className="bi bi-camera" /> Scan QR</Link></div></div>
        <form action={bulkAbsensi} className="card-body" data-loading-text="Menyimpan absensi massal..."><HiddenReturn returnTo={returnTo} />
          <div className="row g-3">
            <div className="col-md-3"><label className="form-label">Tanggal</label><input type="date" name="tanggal" defaultValue={todayISO()} className="form-control" required /></div>
            <div className="col-md-3"><label className="form-label">Status</label><select name="status" className="form-select">{statusOptions.absensi.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="col-md-3"><label className="form-label">Jam masuk</label><input type="time" name="jam_masuk" defaultValue="08:00" className="form-control" /></div>
            <div className="col-md-3 d-flex align-items-end"><button className="btn btn-primary w-100"><i className="bi bi-check2-circle" /> Simpan massal</button></div>
          </div>
          <div className="bulk-checks mt-3">{karyawan.map((k: any) => <label key={k.id} className="bulk-check"><input type="checkbox" name="karyawan_ids" value={k.id} defaultChecked /> <span>{k.nama}</span></label>)}</div>
        </form>
      </div>
    );
  }

  if (config.slug === 'absensi-bulanan') {
    return (
      <div className="utility-panel mb-4">
        <div className="utility-icon"><i className="bi bi-arrow-repeat" /></div>
        <div className="utility-copy">
          <strong>Sinkron rekap absensi bulanan</strong>
          <span>Ambil jumlah hadir/izin/sakit/alpha/cuti dari absensi harian. Nanti bisa dipakai untuk scan QR kamera.</span>
        </div>
        <form action={generateAbsensiBulanan} className="utility-form" data-loading-text="Membuat rekap absensi bulanan..."><HiddenReturn returnTo={returnTo} />
          <div><label className="form-label small mb-1">Bulan</label><select name="bulan" defaultValue={String(bulan)} className="form-select form-select-sm">{monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div><label className="form-label small mb-1">Tahun</label><input name="tahun" type="number" min="2020" defaultValue={tahun} className="form-control form-control-sm" /></div>
          <button className="btn btn-primary btn-sm"><i className="bi bi-calendar2-check" /> Sinkron</button>
        </form>
      </div>
    );
  }

  return null;
}

function ModuleHero({ config, rows, all, query, searchParams }: any) {
  const activeFilters = ['search', 'status', 'prioritas', 'jenis_cuti', 'bulan', 'tahun'].filter((k) => searchParams[k]).length;
  return (
    <section className="module-hero mb-4">
      <div className="module-hero-main">
        <div className="module-hero-icon"><i className={`bi ${config.icon}`} /></div>
        <div>
          <span className="eyebrow">Manajemen data</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
      </div>
      <div className="module-hero-actions">
        {config.exports ? <><Link href={`/export/${config.slug}/xlsx?${query}`} className="btn btn-light border"><i className="bi bi-file-earmark-excel" /> Excel</Link><Link href={`/export/${config.slug}/pdf?${query}`} target="_blank" rel="noopener noreferrer" className="btn btn-light border"><i className="bi bi-file-earmark-pdf" /> Preview PDF</Link></> : null}
        {config.hasCreate ? <Link href={`/${config.slug}/create`} className="btn btn-primary"><i className="bi bi-plus-lg" /> Tambah {config.single}</Link> : null}
      </div>
      <div className="module-hero-metrics">
        <div><span>Total data</span><strong>{all.length}</strong></div>
        <div><span>Hasil tampil</span><strong>{rows.length}</strong></div>
        <div><span>Filter aktif</span><strong>{activeFilters}</strong></div>
      </div>
    </section>
  );
}

export default async function ModulePage({ params, searchParams }: { params: { module: string }; searchParams: Record<string, string> }) {
  const config = getModule(params.module);
  if (!config) notFound();
  const { rows, all, lookups, bulan, tahun } = await moduleRows(config, searchParams);
  const query = new URLSearchParams(searchParams as any).toString();
  const returnTo = `/${config.slug}${query ? `?${query}` : ""}`;
  return (
    <>
      <ModuleHero config={config} rows={rows} all={all} query={query} searchParams={searchParams} />
      {messageBox(searchParams)}
      <ModuleTools config={config} rows={rows} bulan={bulan} tahun={tahun} lookups={lookups} returnTo={returnTo} />

      <div className="card toolbar-card mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end">
            <div className="col-lg-4 col-md-6"><label className="form-label">Cari data</label><div className="input-with-icon"><i className="bi bi-search" /><input type="search" name="search" defaultValue={searchParams.search || ''} className="form-control" placeholder={`Cari ${config.title.toLowerCase()}...`} /></div></div>
            {config.monthly ? <><div className="col-lg-2 col-md-3"><label className="form-label">Bulan</label><select name="bulan" defaultValue={String(bulan)} className="form-select">{monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div><div className="col-lg-2 col-md-3"><label className="form-label">Tahun</label><input name="tahun" type="number" min="2020" defaultValue={tahun} className="form-control" /></div></> : null}
            {(config.filters || []).map((f) => <div className="col-lg-2 col-md-3" key={f.name}><label className="form-label">{f.label}</label><select name={f.name} defaultValue={searchParams[f.name] || ''} className="form-select"><option value="">Semua</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>)}
            <div className="col-lg-2 col-md-4 d-flex gap-2"><button className="btn btn-primary flex-fill"><i className="bi bi-funnel" /> Filter</button><Link href={`/${config.slug}`} className="btn btn-light border">Reset</Link></div>
          </form>
        </div>
      </div>

      <div className="card data-card">
        <div className="data-table-head">
          <div>
            <span className="eyebrow">Database table</span>
            <strong>{rows.length} data {config.title.toLowerCase()}</strong>
          </div>
          <span className="table-live-dot"><i /> Realtime-ready</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 admin-table">
              <thead><tr>{config.columns.map((c) => <th key={c.key}>{c.label}</th>)}<th className="text-end pe-4">Aksi</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((row: any) => (
                  <tr key={row.id}>
                    {config.columns.map((c, index) => <td key={c.key}>{renderCell(row, c, lookups, index)}</td>)}
                    <td className="text-end pe-4"><div className="action-group">
                      <QuickActions module={config.slug} row={row} returnTo={returnTo} />
                      {config.canShow ? <Link className="action-btn action-view" href={`/${config.slug}/${row.id}`}><i className="bi bi-eye" /> Detail</Link> : null}
                      {config.canEdit ? <Link className="action-btn action-edit" href={`/${config.slug}/${row.id}/edit`}><i className="bi bi-pencil-square" /> Edit</Link> : null}
                      {config.canDelete ? <form action={deleteRecord.bind(null, config.slug, String(row.id))} data-confirm="Yakin hapus data ini? Data yang sudah dihapus tidak bisa dikembalikan." data-loading-text="Menghapus data..."><HiddenReturn returnTo={returnTo} /><button className="action-btn action-delete"><i className="bi bi-trash3" /> Hapus</button></form> : null}
                    </div></td>
                  </tr>
                )) : <tr><td colSpan={config.columns.length + 1}><div className="empty-state"><i className="bi bi-inboxes" /><strong>Belum ada data</strong><span>Mulai tambah data baru atau ubah filter pencarian.</span></div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
