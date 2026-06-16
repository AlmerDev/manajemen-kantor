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
    delete form.dataset.loadingStarted;
    delete form.dataset.activeLoadingText;
    delete form.dataset.controlsDisabled;
  });

  document.querySelectorAll<HTMLButtonElement>('button.is-loading').forEach((button) => {
    button.disabled = false;
    button.classList.remove('is-loading');
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
  button.setAttribute('aria-busy', 'true');
  button.innerHTML = `<span class="btn-spinner"></span><span>${text}</span>`;
}

function isSubmitButton(element: Element | null): element is HTMLButtonElement | HTMLInputElement {
  if (!element) return false;
  if (element instanceof HTMLButtonElement) return !element.type || element.type === 'submit';
  if (element instanceof HTMLInputElement) return element.type === 'submit';
  return false;
}

function formSubmitButtons(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="submit"]'));
}

function disableFormControls(form: HTMLFormElement, text: string) {
  if (form.dataset.controlsDisabled === '1') return;
  form.dataset.controlsDisabled = '1';
  formSubmitButtons(form).forEach((control) => {
    if (control instanceof HTMLButtonElement) {
      setButtonLoading(control, text);
    } else {
      control.disabled = true;
    }
  });
}

function startFormLoading(form: HTMLFormElement, submitter?: HTMLElement | null, forceText?: string, disableControls = true) {
  if (form.dataset.noLoading === 'true') return false;
  if (form.dataset.submitting === '1') return false;

  const text = forceText || form.dataset.loadingText || textFromSubmitter(submitter) || 'Memproses aksi...';
  form.classList.add('is-submitting');
  form.dataset.submitting = '1';
  form.dataset.loadingStarted = '1';
  form.dataset.activeLoadingText = text;
  showProcessLoading(text, false);

  // Saat dipanggil dari click, tombol belum boleh di-disable dulu karena bisa membatalkan submit bawaan browser.
  // Submit event akan men-disable tombol setelah validasi browser lolos.
  if (disableControls) disableFormControls(form, text);
  return true;
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

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const submitControl = target.closest('button, input[type="submit"]');
      if (isSubmitButton(submitControl)) {
        const form = submitControl.form;
        if (form && form.dataset.noLoading !== 'true') {
          if (form.dataset.submitting === '1') {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
          }

          // Form hapus/reject/bayar tetap tunggu popup konfirmasi dulu.
          if (!(form.dataset.confirm && form.dataset.confirmed !== '1')) {
            if (!form.checkValidity()) return;
            startFormLoading(form, submitControl, undefined, false);
            startFallback();
          }
        }
        return;
      }

      const link = target.closest('a') as HTMLAnchorElement | null;
      if (!link || shouldIgnoreLink(link, event) || link.dataset.noLoading === 'true') return;
      const text = link.dataset.loadingText || 'Membuka halaman...';
      link.classList.add('is-link-loading');
      link.setAttribute('aria-busy', 'true');
      showProcessLoading(text, false);
      startFallback();
    };

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.noLoading === 'true') return;

      if (form.dataset.submitting === '1') {
        // Kalau loading sudah dinyalakan dari klik tombol, submit pertama tetap jalan.
        // Di titik ini validasi browser sudah lolos, jadi tombol aman untuk di-disable.
        disableFormControls(form, form.dataset.activeLoadingText || form.dataset.loadingText || DEFAULT_TEXT);
        startFallback();
        return;
      }

      const submitEvent = event as SubmitEvent;
      const submitter = submitEvent.submitter instanceof HTMLElement ? submitEvent.submitter : null;

      // Tunggu handler lain seperti modal konfirmasi jalan dulu.
      window.setTimeout(() => {
        if (event.defaultPrevented) return;
        if (form.dataset.submitting === '1') return;
        startFormLoading(form, submitter);
        startFallback();
      }, 0);
    };

    const onFocus = () => { if (!document.hidden) resetProcessLoading(); };
    window.addEventListener('pageshow', resetProcessLoading);
    window.addEventListener('focus', onFocus);
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit);

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit);
      window.removeEventListener('pageshow', resetProcessLoading);
      window.removeEventListener('focus', onFocus);
      clearFallback();
    };
  }, []);

  return null;
}
