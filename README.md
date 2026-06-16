# Manajemen Kantor Supabase + Vercel

Versi ini sudah termasuk fitur Setting Kantor, Data Gaji per Karyawan, Absensi Bulanan, generate payroll otomatis, export Excel/PDF preview, dan flow approve lalu bayar.

## Jalankan lokal

```bash
npm config set registry https://registry.npmjs.org/
npm install
npm run dev
```

## Database

Untuk project baru / reset total, jalankan:

```txt
supabase/reset_database.sql
```

Untuk database lama yang sudah berisi data dan tidak mau dihapus, jalankan migration tambahan:

```txt
supabase/add_payroll_structure.sql
```

## Login demo

```txt
Email: admin@kantor.com
Password: password
```

## Fitur payroll baru

- Data Master → Data Gaji: atur gaji pokok per karyawan, uang makan harian, transport harian, tunjangan harian, BPJS default, dan potongan default.
- Operasional → Absensi Bulanan: input total hadir, izin, sakit, alpha, cuti, dan keterangan per karyawan per bulan.
- Penggajian → Generate: otomatis ambil Data Gaji + Absensi Bulanan. Uang makan dan transport dihitung dari total hadir.
- Kalau Absensi Bulanan belum ada, generate akan fallback hitung dari Absensi Harian.
- Kasbon tetap otomatis dipotong saat gaji yang sudah approved ditandai paid.

## Fitur Absensi QR

Versi ini menambahkan sistem absensi QR:

- Menu admin **QR Karyawan** untuk preview dan download QR setiap karyawan.
- Halaman publik **/scan-absen** untuk scan QR lewat kamera.
- Scan pertama di hari yang sama otomatis menjadi **jam masuk**.
- Scan kedua di hari yang sama otomatis menjadi **jam keluar**.
- Data langsung masuk ke tabel **absensi**.
- Rekap **absensi_bulanan** ikut tersinkron otomatis.
- Halaman Dashboard/Absensi/Absensi Bulanan otomatis refresh berkala, jadi admin tidak perlu reload manual.

Catatan: kalau QR dibuat di localhost, isi QR akan mengarah ke localhost. Setelah deploy ke Vercel, download ulang QR dari domain production.


## Update terbaru - Button alignment fix

- Semua tombol global dipaksa `inline-flex`, `align-items:center`, dan `justify-content:center`.
- Text + icon tombol QR, CRUD, form, modal, scan, dan export sekarang rata tengah.
- Loading spinner di dalam tombol tetap center dan tidak bikin tulisan turun/geser.

## Update loading global
Versi ini menambahkan loading feedback untuk semua proses utama:
- semua form/server action otomatis menampilkan loading dan tombol disable
- login/logout/profile/settings/filter/generate/approve/bayar/hapus/toggle/export/CRUD ikut punya loading
- link internal menampilkan indikator proses saat pindah halaman
- loading otomatis reset setelah route berubah atau setelah proses selesai

## Update auto sync Absensi Bulanan

- Setiap tambah/edit/hapus **Absensi Harian** dari admin, rekap **Absensi Bulanan** otomatis ikut dihitung ulang.
- Absensi massal juga otomatis update rekap bulanan.
- Scan QR tetap otomatis update absensi harian + bulanan.
- Untuk database yang sudah terlanjur jalan, jalankan `supabase/add_absensi_bulanan_auto_sync.sql` agar Supabase juga punya trigger otomatis di level database.
