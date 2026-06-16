'use client';

import { useEffect } from 'react';

export default function AdminClient() {
  useEffect(() => {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    const toggle = (e: Event) => {
      e.preventDefault();
      if (!sidebar || !mainContent || !overlay) return;
      if (window.innerWidth > 992) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
      } else {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('show');
      }
    };

    toggleBtn?.addEventListener('click', toggle);
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('mobile-open');
      overlay?.classList.remove('show');
    });

    let pendingForm: HTMLFormElement | null = null;
    const modal = document.createElement('div');
    modal.className = 'confirm-modal-backdrop';
    modal.innerHTML = `
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
        <div class="confirm-modal-icon"><i class="bi bi-exclamation-triangle"></i></div>
        <div class="confirm-modal-body">
          <span class="eyebrow">Konfirmasi aksi</span>
          <h3 id="confirmModalTitle">Konfirmasi tindakan</h3>
          <p id="confirmModalMessage">Data yang sudah dihapus tidak bisa dikembalikan lewat panel.</p>
        </div>
        <div class="confirm-modal-actions">
          <button type="button" class="btn btn-light border confirm-cancel">Batal</button>
          <button type="button" class="btn btn-danger confirm-ok"><i class="bi bi-trash3"></i> Ya, hapus</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const modalTitle = modal.querySelector('#confirmModalTitle') as HTMLElement | null;
    const modalMessage = modal.querySelector('#confirmModalMessage') as HTMLElement | null;
    const cancelBtn = modal.querySelector('.confirm-cancel') as HTMLButtonElement | null;
    const okBtn = modal.querySelector('.confirm-ok') as HTMLButtonElement | null;

    const toast = document.createElement('div');
    toast.id = 'actionLoadingToast';
    toast.className = 'action-loading-toast';
    toast.innerHTML = `<span class="mini-spinner"></span><strong>Memproses...</strong>`;
    document.body.appendChild(toast);

    const closeConfirm = () => {
      pendingForm = null;
      modal.classList.remove('show');
    };

    let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

    const resetLoading = () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      loadingTimeout = null;
      toast.classList.remove('show');
      toast.classList.remove('is-error');
      toast.querySelector('strong')!.textContent = 'Memproses...';
      document.querySelectorAll<HTMLFormElement>('form.is-submitting, form[data-submitting="1"]').forEach((activeForm) => {
        activeForm.classList.remove('is-submitting');
        delete activeForm.dataset.submitting;
        delete activeForm.dataset.confirmed;
      });
      document.querySelectorAll<HTMLButtonElement>('button.is-loading').forEach((btn) => {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        if (btn.dataset.originalHtml) {
          btn.innerHTML = btn.dataset.originalHtml;
          delete btn.dataset.originalHtml;
        }
      });
      document.querySelectorAll<HTMLInputElement>('input[type="submit"]:disabled').forEach((btn) => {
        btn.disabled = false;
      });
    };

    const showLoading = (form: HTMLFormElement) => {
      const text = form.dataset.loadingText || 'Memproses aksi...';
      form.classList.add('is-submitting');
      form.dataset.submitting = '1';
      toast.querySelector('strong')!.textContent = text;
      toast.classList.add('show');
      const buttons = form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="submit"]');
      buttons.forEach((btn) => {
        if (btn instanceof HTMLButtonElement) {
          if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
          btn.disabled = true;
          btn.classList.add('is-loading');
          btn.innerHTML = `<span class="btn-spinner"></span>${text}`;
        } else {
          btn.disabled = true;
        }
      });

      // Pengaman: kalau browser/server action tidak melakukan full reload,
      // loading tidak boleh nyangkut selamanya.
      if (loadingTimeout) clearTimeout(loadingTimeout);
      loadingTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toast.querySelector('strong')!.textContent = 'Selesai diproses';
        document.querySelectorAll<HTMLButtonElement>('button.is-loading').forEach((btn) => {
          btn.disabled = false;
          btn.classList.remove('is-loading');
          if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
            delete btn.dataset.originalHtml;
          }
        });
      }, 18000);
    };

    const submitConfirmed = () => {
      const form = pendingForm;
      if (!form) return closeConfirm();
      form.dataset.confirmed = '1';
      closeConfirm();
      form.requestSubmit();
    };

    cancelBtn?.addEventListener('click', closeConfirm);
    okBtn?.addEventListener('click', submitConfirmed);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeConfirm();
    });

    window.addEventListener('pageshow', resetLoading);
    window.addEventListener('popstate', resetLoading);

    const submitHandler = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.dataset.confirm && form.dataset.confirmed !== '1') {
        e.preventDefault();
        pendingForm = form;
        const message = form.dataset.confirm || 'Data yang sudah dihapus tidak bisa dikembalikan lewat panel.';
        if (modalTitle) modalTitle.textContent = /hapus|delete/i.test(message) ? 'Hapus data ini?' : 'Lanjutkan tindakan?';
        if (modalMessage) modalMessage.textContent = message;
        if (okBtn) okBtn.innerHTML = /hapus|delete/i.test(message) ? '<i class="bi bi-trash3"></i> Ya, hapus' : '<i class="bi bi-check2"></i> Ya, lanjutkan';
        modal.classList.add('show');
        return;
      }

      if (form.dataset.loadingText && form.dataset.submitting !== '1') {
        showLoading(form);
      }
    };

    document.addEventListener('submit', submitHandler);
    const timer = setTimeout(() => document.querySelectorAll('.alert-auto').forEach((el) => el.remove()), 5000);
    return () => {
      toggleBtn?.removeEventListener('click', toggle);
      document.removeEventListener('submit', submitHandler);
      window.removeEventListener('pageshow', resetLoading);
      window.removeEventListener('popstate', resetLoading);
      if (loadingTimeout) clearTimeout(loadingTimeout);
      modal.remove();
      toast.remove();
      clearTimeout(timer);
    };
  }, []);
  return null;
}
