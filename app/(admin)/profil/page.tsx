export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { deleteProfilePhoto, updatePassword, updateProfile } from '@/app/actions';
import { requireUser } from '@/lib/session';
import { publicFileUrl } from '@/lib/supabase';

export default async function ProfilPage({ searchParams }: { searchParams: { success?: string; error?: string } }) {
  const user = await requireUser();
  const avatar = user.avatar ? publicFileUrl(user.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Admin')}&background=141414&color=fff`;
  return (
    <>
      <section className="profile-hero mb-4">
        <div className="profile-hero-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt="" className="profile-photo-lg" />
          <div>
            <span className="eyebrow">Account center</span>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="profile-role-card">
          <span>Role</span>
          <strong>{user.role}</strong>
          <small>Admin dashboard</small>
        </div>
      </section>

      {searchParams.success ? <div className="alert alert-success alert-auto"><i className="bi bi-check-circle me-2" />{searchParams.success}</div> : null}
      {searchParams.error ? <div className="alert alert-danger alert-auto"><i className="bi bi-exclamation-triangle me-2" />{searchParams.error}</div> : null}

      <div className="profile-grid">
        <div className="profile-main-stack">
          <form action={updateProfile} className="card premium-card" data-loading-text="Menyimpan profil...">
            <div className="card-header panel-header"><div><span className="eyebrow">Personal info</span><strong><i className="bi bi-person-gear me-2" />Profil admin</strong></div></div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6"><div className="field-block"><label className="form-label"><i className="bi bi-person" /> Nama</label><input name="name" className="form-control" defaultValue={user.name} required /></div></div>
                <div className="col-md-6"><div className="field-block"><label className="form-label"><i className="bi bi-envelope" /> Email</label><input name="email" type="email" className="form-control" defaultValue={user.email} required /></div></div>
                <div className="col-12"><div className="field-block"><label className="form-label"><i className="bi bi-image" /> Foto profil</label><input name="foto" type="file" accept="image/*" className="form-control" /></div></div>
              </div>
              <div className="mt-4 d-flex gap-2 flex-wrap"><button className="btn btn-primary"><i className="bi bi-save" /> Simpan profil</button></div>
            </div>
          </form>

          <form action={deleteProfilePhoto} data-confirm="Hapus foto profil?" className="danger-inline-card" data-loading-text="Menghapus foto profil...">
            <div><strong>Hapus foto profil</strong><span>Avatar akan kembali ke inisial otomatis.</span></div>
            <button className="btn btn-outline-danger"><i className="bi bi-trash3" /> Hapus foto</button>
          </form>
        </div>

        <aside className="profile-side-stack">
          <form action={updatePassword} className="card premium-card" data-loading-text="Mengganti password...">
            <div className="card-header panel-header"><div><span className="eyebrow">Security</span><strong><i className="bi bi-key me-2" />Ganti password</strong></div></div>
            <div className="card-body">
              <div className="field-block mb-3"><label className="form-label"><i className="bi bi-lock" /> Password saat ini</label><input name="current_password" type="password" className="form-control" required /></div>
              <div className="field-block mb-3"><label className="form-label"><i className="bi bi-shield-lock" /> Password baru</label><input name="password" type="password" className="form-control" required minLength={8} /></div>
              <div className="field-block mb-4"><label className="form-label"><i className="bi bi-check2-circle" /> Konfirmasi password</label><input name="password_confirmation" type="password" className="form-control" required minLength={8} /></div>
              <button className="btn btn-dark w-100"><i className="bi bi-shield-check" /> Update password</button>
            </div>
          </form>

          <div className="security-note">
            <span><i className="bi bi-info-circle" /></span>
            <div><strong>Tips keamanan</strong><p>Gunakan password minimal 8 karakter dan jangan bagikan akses admin ke orang lain.</p></div>
          </div>
        </aside>
      </div>
    </>
  );
}
