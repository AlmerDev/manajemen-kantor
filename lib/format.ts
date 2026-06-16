export const bulanNama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function rupiah(value: any) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function tanggal(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function waktu(value?: string | null) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}

export function initial(name?: string | null) {
  return (name || '—').trim().slice(0, 1).toUpperCase();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthYearNow() {
  const d = new Date();
  return { bulan: d.getMonth() + 1, tahun: d.getFullYear() };
}
