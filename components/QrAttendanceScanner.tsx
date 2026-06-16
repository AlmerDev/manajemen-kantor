'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OfficeSettings } from '@/lib/office';

type ScanResult = {
  ok: boolean;
  message: string;
  scanType?: string;
  karyawan?: { id: number; nip: string; nama: string; departemen?: string };
  absensi?: { tanggal: string; jam_masuk?: string; jam_keluar?: string; status: string };
  summary?: { total_hadir: number; total_izin: number; total_sakit: number; total_alpha: number; total_cuti: number };
  tanggal?: string;
  waktu?: string;
};

type Props = {
  settings: OfficeSettings;
  logoUrl?: string;
};

function getToken(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.searchParams.get('token') || value;
  } catch {
    return value;
  }
}

export default function QrAttendanceScanner({ settings, logoUrl = '' }: Props) {
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<any>(null);
  const lockedRef = useRef(false);

  const sendToken = useCallback(async (raw: string) => {
    const token = getToken(raw);
    if (!token) {
      setError('QR/token kosong. Scan ulang atau tempel token manual.');
      return;
    }
    if (lockedRef.current) return;
    lockedRef.current = true;
    setProcessing(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/absen/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const json = await res.json();
      setResult(json);
      if (!json.ok) setError(json.message || 'Scan gagal diproses.');
    } catch (err: any) {
      setError(err?.message || 'Tidak bisa menghubungi server absensi.');
    } finally {
      setProcessing(false);
      setTimeout(() => { lockedRef.current = false; }, 1600);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.getState && scanner.getState() === 2) await scanner.stop();
      else await scanner.stop?.();
    } catch {}
    try { await scanner.clear?.(); } catch {}
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError('');
    setResult(null);
    setCameraReady(false);
    setScanning(true);
    try {
      const mod = await import('html5-qrcode');
      const Html5Qrcode = (mod as any).Html5Qrcode;
      const scanner = new Html5Qrcode('qr-reader', false);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 280 }, aspectRatio: 1.333 },
        async (decodedText: string) => {
          if (lockedRef.current) return;
          lockedRef.current = true;
          await stopScanner();
          lockedRef.current = false;
          await sendToken(decodedText);
        },
        () => {}
      );
      setCameraReady(true);
    } catch (err: any) {
      setScanning(false);
      setCameraReady(false);
      setError(err?.message || 'Kamera tidak bisa dibuka. Pastikan izin kamera sudah di-allow, lalu coba lagi.');
    }
  }, [sendToken, stopScanner]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) sendToken(token);
    return () => { void stopScanner(); };
  }, [sendToken, stopScanner]);


  return (
    <div className="scan-page">
      <section className="scan-card scan-hero-card">
        <div className="scan-brand-mark">{logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo kantor" />
        ) : <i className="bi bi-qr-code-scan" />}</div>
        <div>
          <span className="scan-kicker">Absensi QR</span>
          <h1>Scan QR karyawan</h1>
          <p>{settings.office_name || 'Panel kantor'} · Scan QR untuk absen masuk. Scan kedua di hari yang sama otomatis menjadi jam keluar.</p>
        </div>
      </section>

      <section className="scan-grid">
        <div className="scan-card scan-camera-card">
          <div className="scan-section-head">
            <div>
              <span className="scan-kicker">Camera scanner</span>
              <h2>Scan lewat kamera</h2>
            </div>
            <span className={`scan-status-pill ${cameraReady ? 'ready' : 'idle'}`}>{cameraReady ? 'Kamera aktif' : 'Siap scan'}</span>
          </div>

          <div className="scanner-frame">
            <div id="qr-reader" className="qr-reader-box" />
            {!scanning ? <div className="scanner-placeholder"><i className="bi bi-camera-video" /><span>Klik mulai scan untuk membuka kamera</span></div> : null}
            {processing ? <div className="scanner-processing"><span className="spinner-border spinner-border-sm" /> Memproses absensi...</div> : null}
          </div>

          <div className="scan-actions">
            {!scanning ? <button type="button" className="btn btn-primary" onClick={startScanner} disabled={processing}><i className="bi bi-camera" /> Mulai Scan</button> : null}
            {scanning ? <button type="button" className="btn btn-light border" onClick={() => void stopScanner()} disabled={processing}><i className="bi bi-stop-circle" /> Stop Kamera</button> : null}
          </div>
        </div>

        <div className="scan-card scan-info-card">
          <span className="scan-kicker">Hasil scan</span>
          {!result && !error ? (
            <div className="scan-empty-result"><i className="bi bi-person-check" /><strong>Belum ada scan</strong><span>Hasil absensi akan muncul di sini setelah QR berhasil dibaca.</span></div>
          ) : null}
          {error ? <div className="scan-alert scan-alert-error"><i className="bi bi-exclamation-triangle" /> {error}</div> : null}
          {result?.ok ? (
            <div className="scan-success-box">
              <div className="scan-success-icon"><i className="bi bi-check2" /></div>
              <div>
                <span className="scan-kicker">Berhasil</span>
                <h2>{result.message}</h2>
              </div>
              <div className="scan-result-list">
                <div><span>Nama</span><strong>{result.karyawan?.nama}</strong></div>
                <div><span>NIP</span><strong>{result.karyawan?.nip || '-'}</strong></div>
                <div><span>Tanggal</span><strong>{result.absensi?.tanggal || result.tanggal}</strong></div>
                <div><span>Masuk</span><strong>{result.absensi?.jam_masuk || '-'}</strong></div>
                <div><span>Keluar</span><strong>{result.absensi?.jam_keluar || '-'}</strong></div>
                <div><span>Hadir bulan ini</span><strong>{result.summary?.total_hadir ?? 0} hari</strong></div>
              </div>
              <button type="button" className="btn btn-primary w-100" onClick={startScanner} disabled={processing || scanning}><i className="bi bi-qr-code-scan" /> Scan Berikutnya</button>
            </div>
          ) : null}

          <div className="manual-scan-box">
            <label className="form-label">Input manual token / URL QR</label>
            <textarea className="form-control" rows={3} placeholder="Tempel isi QR di sini kalau kamera bermasalah..." value={manualToken} onChange={(e) => setManualToken(e.target.value)} />
            <button type="button" className="btn btn-dark w-100 mt-2" onClick={() => sendToken(manualToken)} disabled={processing}><i className="bi bi-send" /> Proses Manual</button>
          </div>
        </div>
      </section>
    </div>
  );
}
