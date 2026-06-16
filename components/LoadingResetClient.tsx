'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

function resetActionLoading() {
  document.documentElement.classList.remove('is-global-loading');
  const toast = document.getElementById('actionLoadingToast');
  toast?.classList.remove('show');
  toast?.classList.remove('is-error');
  const label = toast?.querySelector('strong');
  if (label) label.textContent = 'Memproses...';

  const overlay = document.getElementById('globalProcessOverlay');
  overlay?.classList.remove('show');
  const overlayTitle = overlay?.querySelector('.global-process-card strong');
  if (overlayTitle) overlayTitle.textContent = 'Memproses...';

  document.querySelectorAll<HTMLFormElement>('form.is-submitting, form[data-submitting="1"]').forEach((form) => {
    form.classList.remove('is-submitting');
    delete form.dataset.submitting;
    delete form.dataset.confirmed;
    delete form.dataset.loadingStarted;
    delete form.dataset.activeLoadingText;
    delete form.dataset.controlsDisabled;
  });

  document.querySelectorAll<HTMLButtonElement>('button.is-loading').forEach((button) => {
    button.classList.remove('is-loading');
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  });

  document.querySelectorAll<HTMLInputElement>('input[type="submit"]:disabled').forEach((input) => {
    input.disabled = false;
  });

  document.querySelectorAll<HTMLAnchorElement>('a.is-link-loading').forEach((link) => {
    link.classList.remove('is-link-loading');
    link.removeAttribute('aria-busy');
  });
}

export default function LoadingResetClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchKey = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    // Server action sukses/error biasanya mengubah query (?success / ?error).
    // Toast loading harus ditutup begitu route sudah selesai update.
    resetActionLoading();
  }, [pathname, searchKey]);

  useEffect(() => {
    // Kasbon sering berubah otomatis dari pembayaran gaji.
    // Saat halaman kasbon dibuka / tab kembali aktif, paksa ambil data fresh dari server.
    if (pathname !== '/kasbon') return;

    router.refresh();

    const refreshKasbon = () => {
      if (!document.hidden) router.refresh();
    };

    window.addEventListener('focus', refreshKasbon);
    document.addEventListener('visibilitychange', refreshKasbon);
    return () => {
      window.removeEventListener('focus', refreshKasbon);
      document.removeEventListener('visibilitychange', refreshKasbon);
    };
  }, [pathname, router, searchKey]);

  return null;
}
