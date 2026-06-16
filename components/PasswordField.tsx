'use client';

import { useState } from 'react';

export default function PasswordField({ defaultValue = '' }: { defaultValue?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="guest-input-wrap password-input-wrap">
      <span className="guest-input-icon"><i className="bi bi-key" /></span>
      <input
        id="login-password"
        type={visible ? 'text' : 'password'}
        name="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
        defaultValue={defaultValue}
      />
      <button
        type="button"
        className="password-eye-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan password' : 'Lihat password'}
        title={visible ? 'Sembunyikan password' : 'Lihat password'}
      >
        <i className={`bi ${visible ? 'bi-eye-slash' : 'bi-eye'}`} />
      </button>
    </div>
  );
}
