import Link from 'next/link';
import { Field, ModuleConfig } from '@/lib/modules';
import { saveRecord } from '@/app/actions';

function inputValue(field: Field, row: any) {
  const v = row?.[field.name];
  if (v !== undefined && v !== null) {
    if (field.type === 'date') return String(v).slice(0, 10);
    if (field.type === 'time') return String(v).slice(0, 5);
    return String(v);
  }
  if (field.defaultValue !== undefined && field.defaultValue !== null) return String(field.defaultValue);
  return '';
}

function optionsFor(field: Field, lookups: Record<string, any[]>) {
  if (field.options) return field.options;
  if (field.relation) {
    let rows = lookups[field.relation.table] || [];
    if (field.relation.activeOnly) rows = rows.filter((r) => r.status === 'aktif' || r.status === undefined);
    return rows.map((r) => ({ value: String(r[field.relation!.value]), label: String(r[field.relation!.label] || r.id) }));
  }
  return [];
}

function fieldIcon(type: string) {
  const map: Record<string, string> = {
    text: 'bi-type', email: 'bi-envelope', number: 'bi-123', date: 'bi-calendar3', time: 'bi-clock', textarea: 'bi-card-text', select: 'bi-chevron-down', checkbox: 'bi-toggle-on', file: 'bi-image', password: 'bi-key'
  };
  return map[type] || 'bi-ui-checks';
}

function FieldInput({ field, row, lookups, mode }: { field: Field; row: any; lookups: Record<string, any[]>; mode: 'create' | 'update' }) {
  if (mode === 'create' && field.editOnly) return null;
  if (mode === 'update' && field.createOnly) return null;
  const common = { id: field.name, name: field.name, required: field.required, placeholder: field.placeholder || '', defaultValue: inputValue(field, row), className: 'form-control' } as any;
  if (field.type === 'textarea') {
    return <textarea {...common} rows={4} />;
  }
  if (field.type === 'select') {
    return (
      <select id={field.name} name={field.name} required={field.required} defaultValue={inputValue(field, row)} className="form-select">
        <option value="">Pilih {field.label}</option>
        {optionsFor(field, lookups).map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (field.type === 'checkbox') {
    const checked = row?.[field.name] ?? field.defaultValue ?? false;
    return (
      <div className="smart-switch-field">
        <input type="hidden" name={field.name} value="false" />
        <input
          className="smart-switch-input"
          type="checkbox"
          id={field.name}
          name={field.name}
          value="true"
          defaultChecked={Boolean(checked)}
        />
        <label className="smart-switch-label" htmlFor={field.name}>
          <span className="smart-switch-control" aria-hidden="true"><span /></span>
          <span className="smart-switch-text">
            <strong>{Boolean(checked) ? 'Aktif' : 'Nonaktif'}</strong>
            <small>Data ini {Boolean(checked) ? 'dipakai' : 'tidak dipakai'} di sistem.</small>
          </span>
        </label>
      </div>
    );
  }
  if (field.type === 'file') {
    return <input id={field.name} name={field.name} type="file" accept={field.name.includes('file') ? undefined : 'image/*'} className="form-control" />;
  }
  return <input {...common} type={field.type} min={field.min} max={field.max} step={field.step} />;
}

export default function CrudForm({ config, row, lookups, mode, error }: { config: ModuleConfig; row?: any; lookups: Record<string, any[]>; mode: 'create' | 'update'; error?: string }) {
  const action = saveRecord.bind(null, config.slug, mode, row?.id ? String(row.id) : null);
  const visibleFields = config.fields.filter((field) => !(mode === 'create' && field.editOnly) && !(mode === 'update' && field.createOnly));
  return (
    <>
      <div className="form-page-hero mb-4">
        <div className="form-page-mark"><i className={`bi ${config.icon}`} /></div>
        <div>
          <span className="eyebrow">{mode === 'create' ? 'Buat data baru' : 'Perbarui data'}</span>
          <h1>{mode === 'create' ? `Tambah ${config.single}` : `Edit ${config.single}`}</h1>
          <p>{config.description}</p>
        </div>
        <Link href={`/${config.slug}`} className="btn btn-light border ms-auto"><i className="bi bi-arrow-left" /> Kembali</Link>
      </div>

      <div className="form-shell">
        <aside className="form-aside">
          <span className="aside-icon"><i className="bi bi-ui-checks-grid" /></span>
          <h2>Form {config.single}</h2>
          <p>Isi data dengan rapi. Field bertanda bintang wajib diisi sebelum disimpan.</p>
          <div className="aside-stats">
            <div><strong>{visibleFields.length}</strong><span>Field</span></div>
            <div><strong>{visibleFields.filter((f) => f.required).length}</strong><span>Wajib</span></div>
          </div>
        </aside>

        <form action={action} className="card form-card premium-card" data-loading-text={mode === 'create' ? 'Menyimpan data...' : 'Memperbarui data...'}>
          <div className="card-header panel-header">
            <div><span className="eyebrow">Input data</span><strong><i className={`bi ${config.icon} me-2`} />{config.single}</strong></div>
            <span className="badge bg-secondary">{mode === 'create' ? 'Create' : 'Update'}</span>
          </div>
          <div className="card-body">
            {error ? <div className="alert alert-danger alert-auto"><i className="bi bi-exclamation-triangle me-2" />{error}</div> : null}
            <div className="row g-3 form-grid-premium">
              {visibleFields.map((field) => (
                <div className={field.type === 'textarea' ? 'col-12' : 'col-md-6'} key={field.name}>
                  <div className="field-block">
                    <label className="form-label" htmlFor={field.name}><i className={`bi ${fieldIcon(field.type)}`} /> {field.label}{field.required ? <span className="text-danger"> *</span> : null}</label>
                    <FieldInput field={field} row={row} lookups={lookups} mode={mode} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card-footer sticky-form-actions">
            <Link href={`/${config.slug}`} className="btn btn-light border"><i className="bi bi-x-lg" /> Batal</Link>
            <button type="submit" className="btn btn-primary"><i className="bi bi-save" /> Simpan data</button>
          </div>
        </form>
      </div>
    </>
  );
}
