import crypto from 'crypto';

export type AttendanceQrPayload = {
  v: 1;
  karyawanId: number;
  iat: number;
};

function secret() {
  return process.env.AUTH_SECRET || 'dev-secret-change-this';
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function encode(payload: AttendanceQrPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function createAttendanceQrToken(karyawanId: number) {
  const payload = encode({ v: 1, karyawanId, iat: Math.floor(Date.now() / 1000) });
  return `${payload}.${sign(payload)}`;
}

export function verifyAttendanceQrToken(token: string): AttendanceQrPayload | null {
  const clean = String(token || '').trim();
  const [payload, signature] = clean.split('.');
  if (!payload || !signature) return null;
  if (sign(payload) !== signature) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AttendanceQrPayload;
    if (decoded.v !== 1 || !decoded.karyawanId || Number.isNaN(Number(decoded.karyawanId))) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function extractAttendanceToken(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.searchParams.get('token') || value;
  } catch {
    return value;
  }
}

export function jakartaNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}:${parts.second}`;
  return {
    date,
    time,
    month: Number(parts.month),
    year: Number(parts.year)
  };
}
