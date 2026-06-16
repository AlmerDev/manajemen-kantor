'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  karyawan: 'Karyawan',
  jabatan: 'Jabatan',
  'data-gaji': 'Data Gaji',
  tugas: 'Tugas',
  absensi: 'Absensi',
  'absensi-bulanan': 'Absensi Bulanan',
  'qr-karyawan': 'QR Karyawan',
  cuti: 'Cuti',
  pengumuman: 'Pengumuman',
  gaji: 'Penggajian',
  kasbon: 'Kasbon',
  profil: 'Profil Admin',
  settings: 'Setting Kantor'
};

export default function TopbarTitle() {
  const pathname = usePathname() || '/dashboard';
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const title = pageTitles[segment] || segment.replaceAll('-', ' ');

  return (
    <div className="topbar-page d-none d-md-flex">
      <span className="topbar-dot" />
      <div>
        <p className="topbar-kicker mb-0">Office panel</p>
        <strong className="topbar-title text-capitalize">{title}</strong>
      </div>
    </div>
  );
}
