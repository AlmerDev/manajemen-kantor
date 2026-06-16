'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const DEFAULT_TEXT = 'Memproses...';

function textFromSubmitter(submitter: HTMLElement | null | undefined) {
  if (!submitter) return '';
  const fromData = submitter.getAttribute('data-loading-text');
  if (fromData) return fromData;
  const text = submitter.textContent?.replace(/\s+/g, ' ').trim();
  return text ? `${text}...` : '';
}

function ensureToast() {
  let toast = document.getElementById('actionLoadingToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'actionLoadingToast';
    toast.className = 'action-loading-toast';
    toast.innerHTML = `<span class="mini-spinner"></span><strong>${DEFAULT_TEXT}</strong>`;
    document.body.appendChild(toast);
  }
  return toast;
}

function ensurePageOverlay() {
  let overlay = document.getElementById('globalProcessOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalProcessOverlay';
    overlay.className = 'global-process-overlay';
    overlay.innerHTML = `
      <div class="global-process-card">
        <span class="global-process-spinner"></span>
        <div>
          <strong>${DEFAULT_TEXT}</strong>
          <small>Mohon tunggu, aksi sedang dijalankan.</small>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  return overlay;
}

function setToastText(text: string) {
  const toast = ensureToast();
  const label = toast.querySelector('strong');
  if (label) label.textContent = text;
  const overlay = ensurePageOverlay();
  const overlayTitle = overlay.querySelector('.global-process-card strong');
  if (overlayTitle) overlayTitle.textContent = text;
}

function resetProcessLoading() {
  document.documentElement.classList.remove('is-global-loading');

  const toast = document.getElementById('actionLoadingToast');
  toast?.classList.remove('show');
  toast?.classList.remove('is-error');
  const label = toast?.querySelector('strong');
  if (label) label.textContent = DEFAULT_TEXT;

  const overlay = document.getElementById('globalProcessOverlay');
  overlay?.classList.remove('show');
  const overlayTitle = overlay?.querySelector('.global-process-card strong');
  if (overlayTitle) overlayTitle.textContent = DEFAULT_TEXT;

  document.querySelectorAll<HTMLFormElement>('form.is-submitting, form[data-submitting="1"]').forEach((form) => {
    form.classList.remove('is-submitting');
    delete form.dataset.submitting;
    delete form.dataset.confirmed;
  });

  document.querySelectorAll<HTMLButtonElement>('button.is-loading').forEach((button) => {
    button.disabled = false;
    button.classList.remove('is-loading');
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

function showProcessLoading(text = DEFAULT_TEXT, withOverlay = false) {
  setToastText(text);
  document.documentElement.classList.add('is-global-loading');
  ensureToast().classList.add('show');
  if (withOverlay) ensurePageOverlay().classList.add('show');
}

function setButtonLoading(button: HTMLButtonElement, text: string) {
  if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
  button.disabled = true;
  button.classList.add('is-loading');
  button.innerHTML = `<span class="btn-spinner"></span><span>${text}</span>`;
}

function shouldIgnoreLink(link: HTMLAnchorElement, event: MouseEvent) {
  const href = link.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return true;
  if (link.hasAttribute('download')) return true;
  if (link.target && link.target !== '_self') return true;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return true;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return true;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return true;
  return false;
}

export default function GlobalProcessLoading() {
  const pathname = usePathname();
  useEffect(() => {
    resetProcessLoading();
  }, [pathname]);

  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const clearFallback = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = null;
    };

    const startFallback = () => {
      clearFallback();
      fallbackTimer = setTimeout(() => {
        resetProcessLoading();
      }, 25000);
    };

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.noLoading === 'true') return;

      const submitEvent = event as SubmitEvent;
      const submitter = submitEvent.submitter instanceof HTMLElement ? submitEvent.submitter : null;

      // Tunggu handler lain seperti modal konfirmasi jalan dulu.
      window.setTimeout(() => {
        if (event.defaultPrevented) return;
        if (form.dataset.submitting === '1') return;

        const text = form.dataset.loadingText || textFromSubmitter(submitter) || 'Memproses aksi...';
        form.classList.add('is-submitting');
        form.dataset.submitting = '1';
        showProcessLoading(text, false);

        const buttons = form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="submit"]');
        buttons.forEach((button) => {
          if (button instanceof HTMLButtonElement) {
            setButtonLoading(button, text);
          } else {
            button.disabled = true;
          }
        });
        startFallback();
      }, 0);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a') as HTMLAnchorElement | null;
      if (!link || shouldIgnoreLink(link, event) || link.dataset.noLoading === 'true') return;
      const text = link.dataset.loadingText || 'Membuka halaman...';
      link.classList.add('is-link-loading');
      link.setAttribute('aria-busy', 'true');
      showProcessLoading(text, false);
      startFallback();
    };

    const onFocus = () => { if (!document.hidden) resetProcessLoading(); };
    window.addEventListener('pageshow', resetProcessLoading);
    window.addEventListener('focus', onFocus);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('submit', onSubmit);
      document.removeEventListener('click', onClick);
      window.removeEventListener('pageshow', resetProcessLoading);
      window.removeEventListener('focus', onFocus);
      clearFallback();
    };
  }, []);

  return null;
}
