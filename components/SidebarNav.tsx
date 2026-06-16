'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { modules } from '@/lib/modules';

type SidebarNavProps = {
  appName: string;
  panelName: string;
  tagline: string;
  footerNote: string;
  logoUrl: string;
  pendingCuti: number;
  pendingKasbon: number;
};

const groupMeta: Record<'master' | 'operasional' | 'keuangan', { title: string; icon: string; hint: string }> = {
  master: { title: 'Data Master', icon: 'bi-folder2-open', hint: 'Karyawan, jabatan, gaji' },
  operasional: { title: 'Operasional', icon: 'bi-command', hint: 'Tugas, absensi, QR' },
  keuangan: { title: 'Keuangan', icon: 'bi-wallet2', hint: 'Payroll & kasbon' }
};

function normalizePath(pathname: string | null) {
  if (!pathname) return '/dashboard';
  return pathname.replace(/\/$/, '') || '/dashboard';
}

function isActivePath(pathname: string, href: string) {
  const cleanHref = href.replace(/\/$/, '') || '/';
  if (cleanHref === '/dashboard') return pathname === '/dashboard' || pathname === '' || pathname === '/';
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function badgeFor(slug: string, pendingCuti: number, pendingKasbon: number) {
  if (slug === 'cuti' && pendingCuti > 0) return <span className="menu-badge menu-badge-warning">{pendingCuti}</span>;
  if (slug === 'kasbon' && pendingKasbon > 0) return <span className="menu-badge menu-badge-danger">{pendingKasbon}</span>;
  return null;
}

export default function SidebarNav({ appName, panelName, tagline, footerNote, logoUrl, pendingCuti, pendingKasbon }: SidebarNavProps) {
  const pathname = normalizePath(usePathname());
  const byGroup = (group: 'master' | 'operasional' | 'keuangan') => modules.filter((m) => m.menuGroup === group);

  return (
    <nav className="sidebar-menu" aria-label="Navigasi dashboard">
      <Link href="/dashboard" className={`menu-item menu-item-dashboard ${isActivePath(pathname, '/dashboard') ? 'active' : ''}`} aria-current={isActivePath(pathname, '/dashboard') ? 'page' : undefined}>
        <span className="menu-icon"><i className="bi bi-grid" /></span>
        <span className="menu-text">Dashboard</span>
      </Link>

      {(['master', 'operasional', 'keuangan'] as const).map((group) => {
        const meta = groupMeta[group];
        return (
          <div className="menu-section" key={group}>
            <div className="menu-section-head">
              <span className="menu-section-icon"><i className={`bi ${meta.icon}`} /></span>
              <span>
                <span className="menu-title">{meta.title}</span>
                <small>{meta.hint}</small>
              </span>
            </div>
            <div className="menu-section-list">
              {byGroup(group).map((m) => {
                const href = `/${m.slug}`;
                const active = isActivePath(pathname, href);
                return (
                  <Link key={m.slug} href={href} className={`menu-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                    <span className="menu-icon"><i className={`bi ${m.icon}`} /></span>
                    <span className="menu-text">{m.title}</span>
                    {badgeFor(m.slug, pendingCuti, pendingKasbon)}
                  </Link>
                );
              })}
              {group === 'operasional' ? (
                <Link href="/qr-karyawan" className={`menu-item ${isActivePath(pathname, '/qr-karyawan') ? 'active' : ''}`} aria-current={isActivePath(pathname, '/qr-karyawan') ? 'page' : undefined}>
                  <span className="menu-icon"><i className="bi bi-qr-code-scan" /></span>
                  <span className="menu-text">QR Karyawan</span>
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="menu-section menu-settings-section">
        <div className="menu-section-list">
          <Link href="/settings" className={`menu-item ${isActivePath(pathname, '/settings') ? 'active' : ''}`} aria-current={isActivePath(pathname, '/settings') ? 'page' : undefined}>
            <span className="menu-icon"><i className="bi bi-sliders2" /></span>
            <span className="menu-text">Setting Kantor</span>
          </Link>
        </div>
      </div>

      <div className="sidebar-upgrade" title={footerNote || tagline || panelName}>
        <span className="sidebar-upgrade-icon">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo kantor" />
          ) : <i className="bi bi-shield-check" />}
        </span>
        <div>
          <strong>{appName}</strong>
          <p>{footerNote || tagline || panelName}</p>
        </div>
      </div>
    </nav>
  );
}
