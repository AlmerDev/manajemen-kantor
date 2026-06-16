import Link from 'next/link';
import { logoutAction } from '@/app/actions';
import { publicFileUrl } from '@/lib/supabase';
import type { OfficeSettings } from '@/lib/office';
import { officeLogoUrl } from '@/lib/office';
import AdminClient from './AdminClient';
import SidebarNav from './SidebarNav';
import TopbarTitle from './TopbarTitle';
import LoadingResetClient from './LoadingResetClient';
import RealtimeRefreshClient from './RealtimeRefreshClient';

type Props = {
  user: any;
  currentPath: string;
  officeSettings: OfficeSettings;
  pendingCuti: number;
  pendingKasbon: number;
  children: React.ReactNode;
};

export default function AdminShell({ user, currentPath, officeSettings, pendingCuti, pendingKasbon, children }: Props) {
  const appName = officeSettings.office_name || process.env.NEXT_PUBLIC_APP_NAME || 'Kantor';
  const panelName = officeSettings.panel_name || 'Office OS';
  const tagline = officeSettings.tagline || 'Sistem administrasi kantor terpadu.';
  const footerNote = officeSettings.footer_note || 'Panel kantor siap produksi.';
  const logoUrl = officeLogoUrl(officeSettings);
  const avatar = user.avatar ? publicFileUrl(user.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Admin')}&background=141414&color=fff`;

  return (
    <div className="admin-root">
      <AdminClient />
      <LoadingResetClient />
      <RealtimeRefreshClient />
      <aside className="sidebar" id="sidebar" aria-label="Menu utama">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo kantor" width="42" height="42" />
            ) : <i className="bi bi-boxes" />}
          </div>
          <div className="sidebar-brand-lines">
            <span className="suite">{appName}</span>
            <small>{panelName}</small>
          </div>
        </div>

        <SidebarNav appName={appName} panelName={panelName} tagline={tagline} footerNote={footerNote} logoUrl={logoUrl} pendingCuti={pendingCuti} pendingKasbon={pendingKasbon} />
      </aside>

      <main className="main-content" id="mainContent">
        <header className="topbar">
          <button type="button" className="toggle-sidebar-btn" id="sidebarToggle" aria-label="Buka atau tutup menu samping"><i className="bi bi-list" /></button>

          <TopbarTitle />

          <div className="topbar-search d-none d-lg-flex" aria-hidden="true">
            <i className="bi bi-search" />
            <span>Cari data, modul, atau laporan...</span>
            <kbd>⌘K</kbd>
          </div>

          <div className="ms-auto d-flex align-items-center gap-2 gap-md-3">
            <Link href="/profil" className="topbar-profile" aria-label="Buka profil admin">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt="" width="42" height="42" className="user-avatar" />
              <span className="d-none d-sm-flex flex-column lh-1">
                <strong>{user.name}</strong>
                <small className="text-capitalize">{user.role}</small>
              </span>
            </Link>
            <form action={logoutAction} data-loading-text="Keluar dari panel..."><button className="topbar-logout clean-logout" aria-label="Keluar dari panel"><i className="bi bi-box-arrow-right" /><span>Keluar</span></button></form>
          </div>
        </header>
        <div className="content-area">{children}</div>
      </main>
    </div>
  );
}
