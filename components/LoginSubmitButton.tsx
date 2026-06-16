'use client';

import { useFormStatus } from 'react-dom';

export default function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        className={`guest-submit${pending ? ' is-pending' : ''}`}
        disabled={pending}
        aria-busy={pending}
        data-loading-text="Memeriksa akun..."
      >
        {pending ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            <span>Memeriksa akun...</span>
          </>
        ) : (
          <>
            <span>Masuk</span>
            <i className="bi bi-arrow-right-short" aria-hidden="true" />
          </>
        )}
      </button>
      {pending ? (
        <div className="login-inline-loading" role="status" aria-live="polite">
          <span className="mini-spinner" aria-hidden="true" />
          <span>Sedang memproses login, tunggu sebentar...</span>
        </div>
      ) : null}
    </>
  );
}
