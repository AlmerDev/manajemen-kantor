'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const livePaths = ['/dashboard', '/absensi', '/absensi-bulanan', '/kasbon', '/gaji'];

export default function RealtimeRefreshClient() {
  const pathname = usePathname() || '';
  const router = useRouter();

  useEffect(() => {
    const shouldRefresh = livePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (!shouldRefresh) return;

    let last = 0;
    const refresh = () => {
      const now = Date.now();
      if (now - last < 2500) return;
      last = now;
      router.refresh();
    };

    const interval = window.setInterval(refresh, 8000);
    const onFocus = () => refresh();
    const onVisibility = () => { if (!document.hidden) refresh(); };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname, router]);

  return null;
}
