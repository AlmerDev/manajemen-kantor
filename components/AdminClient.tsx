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

    const closeConfirm = () => {
      pendingForm = null;
      modal.classList.remove('show');
      if (okBtn) {
        okBtn.disabled = false;
        okBtn.classList.remove('is-loading');
        okBtn.innerHTML = '<i class="bi bi-trash3"></i> Ya, hapus';
      }
    };

    const submitConfirmed = () => {
      const form = pendingForm;
      if (!form) return closeConfirm();
      if (okBtn?.disabled) return;
      form.dataset.confirmed = '1';
      if (okBtn) {
        okBtn.disabled = true;
        okBtn.classList.add('is-loading');
        okBtn.innerHTML = '<span class="btn-spinner"></span> Memproses...';
      }
      window.setTimeout(() => {
        closeConfirm();
        form.requestSubmit();
      }, 80);
    };

    cancelBtn?.addEventListener('click', closeConfirm);
    okBtn?.addEventListener('click', submitConfirmed);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeConfirm();
    });

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
      }
    };

    document.addEventListener('submit', submitHandler);
    const timer = setTimeout(() => document.querySelectorAll('.alert-auto').forEach((el) => el.remove()), 5000);
    return () => {
      toggleBtn?.removeEventListener('click', toggle);
      document.removeEventListener('submit', submitHandler);
      modal.remove();
      clearTimeout(timer);
    };
  }, []);
  return null;
}
