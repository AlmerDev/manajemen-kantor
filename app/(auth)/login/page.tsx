export const dynamic = "force-dynamic";
import { loginAction } from "@/app/actions";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import PasswordField from "@/components/PasswordField";
import { getOfficeSettings, officeLogoUrl } from "@/lib/office";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; email?: string };
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const settings = await getOfficeSettings();
  const logoUrl = officeLogoUrl(settings);
  return (
    <div className="guest-body">
      <div className="guest-shell">
        <section className="guest-brand-col">
          <div className="guest-brand-col-inner">
            <div className="guest-brand-mark">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo kantor" width="54" height="54" />
              ) : (
                <i className="bi bi-grid-1x2-fill" />
              )}
            </div>
            <h2 className="guest-brand-title">{settings.office_name}</h2>
            <p className="guest-brand-desc">
              {settings.tagline ||
                "Masuk untuk mengelola data karyawan, absensi, cuti, payroll, kasbon, dan pengumuman kantor."}
            </p>
            <ul className="guest-features">
              <li>
                <i className="bi bi-people" /> Data karyawan dan jabatan
              </li>
              <li>
                <i className="bi bi-calendar-check" /> Absensi harian dan
                bulanan
              </li>
              <li>
                <i className="bi bi-wallet2" /> Payroll, kasbon, dan laporan
              </li>
            </ul>
          </div>
          <div className="guest-brand-footnote">
            {settings.footer_note || settings.panel_name || "Office OS"}
            {settings.city ? ` • ${settings.city}` : ""}
          </div>
        </section>
        <section className="guest-form-col">
          <div className="guest-card">
            <h1>Masuk ke panel kantor</h1>
            <p className="guest-subtitle">
              Gunakan akun admin yang sudah terdaftar untuk melanjutkan.
            </p>
            {searchParams.success ? (
              <div className="guest-alert guest-alert-success">
                <i className="bi bi-check-circle-fill" />{" "}
                <span>{searchParams.success}</span>
              </div>
            ) : null}
            {searchParams.error ? (
              <div className="guest-alert guest-alert-danger">
                <i className="bi bi-exclamation-circle-fill" />{" "}
                <span>{searchParams.error}</span>
              </div>
            ) : null}
            <form
              action={loginAction}
              autoComplete="on"
              data-loading-text="Memeriksa akun..."
            >
              <div className="guest-field">
                <label htmlFor="login-email">Email</label>
                <div className="guest-input-wrap">
                  <span className="guest-input-icon">
                    <i className="bi bi-envelope" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="admin@kantor.com"
                    defaultValue={searchParams.email || ""}
                  />
                </div>
              </div>
              <div className="guest-field">
                <label htmlFor="login-password">Kata sandi</label>
                <PasswordField />
              </div>
              <div className="guest-check">
                <input
                  type="checkbox"
                  name="remember"
                  id="remember"
                  value="1"
                />
                <label
                  htmlFor="remember"
                  style={{ margin: 0, cursor: "pointer", fontWeight: 500 }}
                >
                  Ingat saya di perangkat ini
                </label>
              </div>
              <button type="submit" className="guest-submit">
                Masuk
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
