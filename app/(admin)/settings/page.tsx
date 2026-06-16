export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { deleteOfficeLogo, updateOfficeSettings } from '@/app/actions';
import { getOfficeSettings, officeLogoUrl } from '@/lib/office';

export default async function SettingsPage({ searchParams }: { searchParams: { success?: string; error?: string } }) {
  const settings = await getOfficeSettings();
  const logoUrl = officeLogoUrl(settings);

  return (
    <div className="settings-page-wrap">
      {searchParams.success ? <div className="alert alert-success alert-auto"><i className="bi bi-check-circle me-2" />{searchParams.success}</div> : null}
      {searchParams.error ? <div className="alert alert-danger alert-auto"><i className="bi bi-exclamation-circle me-2" />{searchParams.error}</div> : null}

      <section className="settings-hero">
        <div>
          <span className="eyebrow">Konfigurasi sistem</span>
          <h1>Setting Kantor</h1>
          <p>Atur nama kantor, logo, kontak, jam kerja, dan catatan panel yang tampil di sistem.</p>
        </div>
        <div className="settings-preview-card">
          <div className="settings-preview-logo">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo kantor" width="58" height="58" />
            ) : <i className="bi bi-buildings" />}
          </div>
          <div>
            <strong>{settings.office_name}</strong>
            <span>{settings.panel_name || 'Office OS'}</span>
          </div>
        </div>
      </section>

      <div className="settings-grid">
        <section className="settings-panel settings-main-panel">
          <div className="settings-panel-head">
            <div>
              <span className="eyebrow">Data utama</span>
              <h2>Profil kantor</h2>
            </div>
            <span className="settings-save-hint"><i className="bi bi-cloud-check" /> Tersimpan di Supabase</span>
          </div>

          <form action={updateOfficeSettings} className="settings-form" data-loading-text="Menyimpan setting kantor...">
            <div className="settings-form-grid">
              <div className="form-field">
                <label>Nama kantor</label>
                <input type="text" name="office_name" required defaultValue={settings.office_name} placeholder="Contoh: AlmerDev Technology" />
              </div>
              <div className="form-field">
                <label>Nama panel</label>
                <input type="text" name="panel_name" defaultValue={settings.panel_name || ''} placeholder="Contoh: Office OS" />
              </div>
              <div className="form-field span-2">
                <label>Tagline / deskripsi singkat</label>
                <input type="text" name="tagline" defaultValue={settings.tagline || ''} placeholder="Contoh: Sistem administrasi kantor terpadu" />
              </div>
              <div className="form-field">
                <label>Email kantor</label>
                <input type="email" name="email" defaultValue={settings.email || ''} placeholder="admin@kantor.com" />
              </div>
              <div className="form-field">
                <label>No. telepon</label>
                <input type="text" name="phone" defaultValue={settings.phone || ''} placeholder="0812-xxxx-xxxx" />
              </div>
              <div className="form-field">
                <label>Website</label>
                <input type="url" name="website" defaultValue={settings.website || ''} placeholder="https://domain.com" />
              </div>
              <div className="form-field">
                <label>Kota</label>
                <input type="text" name="city" defaultValue={settings.city || ''} placeholder="Jakarta" />
              </div>
              <div className="form-field span-2">
                <label>Alamat kantor</label>
                <textarea name="address" rows={3} defaultValue={settings.address || ''} placeholder="Alamat lengkap kantor" />
              </div>
              <div className="form-field">
                <label>Jam kerja</label>
                <input type="text" name="work_hours" defaultValue={settings.work_hours || ''} placeholder="Senin - Jumat, 08.00 - 17.00" />
              </div>
              <div className="form-field">
                <label>Catatan panel bawah</label>
                <input type="text" name="footer_note" defaultValue={settings.footer_note || ''} placeholder="Contoh: Panel kantor siap produksi." />
                <small className="field-help">Tampil di kartu bawah sidebar dan footer halaman login.</small>
              </div>
              <div className="form-field span-2">
                <label>Upload logo / profil kantor</label>
                <div className="settings-upload-box">
                  <input type="file" name="logo" accept="image/*" />
                  <small>Format PNG/JPG/WebP, maksimal 2MB. Logo akan muncul di sidebar dan login.</small>
                </div>
              </div>
            </div>

            <div className="settings-form-actions">
              <button type="submit" className="btn btn-primary btn-lg pro-save-button"><i className="bi bi-save2" /> Simpan setting</button>
            </div>
          </form>
        </section>

        <aside className="settings-side-panel">
          <section className="settings-panel">
            <div className="settings-panel-head compact">
              <div>
                <span className="eyebrow">Logo aktif</span>
                <h2>Preview brand</h2>
              </div>
            </div>
            <div className="brand-preview-large">
              <div className="brand-preview-logo">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo kantor" width="96" height="96" />
                ) : <i className="bi bi-buildings" />}
              </div>
              <strong>{settings.office_name}</strong>
              <span>{settings.tagline || settings.panel_name}</span>
              <p className="brand-preview-footer-note">{settings.footer_note || 'Catatan panel bawah belum diisi.'}</p>
            </div>
            {logoUrl ? (
              <form action={deleteOfficeLogo} data-confirm="Logo kantor akan dihapus dari tampilan panel." data-loading-text="Menghapus logo...">
                <button className="btn btn-outline-danger w-100" type="submit"><i className="bi bi-trash3" /> Hapus logo</button>
              </form>
            ) : null}
          </section>

          <section className="settings-panel">
            <div className="settings-info-list">
              <div><i className="bi bi-envelope" /><span>Email</span><strong>{settings.email || 'Belum diisi'}</strong></div>
              <div><i className="bi bi-telephone" /><span>Telepon</span><strong>{settings.phone || 'Belum diisi'}</strong></div>
              <div><i className="bi bi-clock" /><span>Jam kerja</span><strong>{settings.work_hours || 'Belum diisi'}</strong></div>
              <div><i className="bi bi-geo-alt" /><span>Lokasi</span><strong>{settings.city || 'Belum diisi'}</strong></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
