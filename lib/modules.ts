export type FieldType = 'text' | 'email' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'checkbox' | 'file' | 'password';

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  relation?: { table: string; value: string; label: string; activeOnly?: boolean };
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  defaultValue?: string | number | boolean;
  createOnly?: boolean;
  editOnly?: boolean;
  hiddenOnEdit?: boolean;
};

export type Column = {
  key: string;
  label: string;
  type?: 'text' | 'money' | 'date' | 'time' | 'status' | 'progress' | 'boolean' | 'month';
  relation?: { table: string; key: string; label: string };
};

export type Filter = { name: string; label: string; options: { value: string; label: string }[] };

export type ModuleConfig = {
  slug: string;
  table: string;
  title: string;
  single: string;
  icon: string;
  menuGroup: 'master' | 'operasional' | 'keuangan';
  description: string;
  fields: Field[];
  columns: Column[];
  searchFields: string[];
  filters?: Filter[];
  exports?: boolean;
  canShow?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  hasCreate?: boolean;
  monthly?: boolean;
};

export const statusOptions = {
  karyawan: [
    { value: 'aktif', label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' },
    { value: 'cuti', label: 'Cuti' }
  ],
  tugas: [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'Berjalan' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Batal' }
  ],
  prioritasTugas: [
    { value: 'rendah', label: 'Rendah' },
    { value: 'sedang', label: 'Sedang' },
    { value: 'tinggi', label: 'Tinggi' },
    { value: 'urgent', label: 'Urgent' }
  ],
  absensi: [
    { value: 'hadir', label: 'Hadir' },
    { value: 'izin', label: 'Izin' },
    { value: 'sakit', label: 'Sakit' },
    { value: 'alpha', label: 'Alpha' },
    { value: 'cuti', label: 'Cuti' },
    { value: 'libur', label: 'Libur' }
  ],
  cutiJenis: [
    { value: 'tahunan', label: 'Tahunan' },
    { value: 'sakit', label: 'Sakit' },
    { value: 'melahirkan', label: 'Melahirkan' },
    { value: 'penting', label: 'Penting' },
    { value: 'lainnya', label: 'Lainnya' }
  ],
  requestStatus: [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' }
  ],
  kasbon: [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'lunas', label: 'Lunas' }
  ],
  gaji: [
    { value: 'draft', label: 'Draft' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'paid', label: 'Dibayar' }
  ],
  pengumuman: [
    { value: 'normal', label: 'Normal' },
    { value: 'penting', label: 'Penting' },
    { value: 'urgent', label: 'Urgent' }
  ],
  meetingStatus: [
    { value: 'scheduled', label: 'Terjadwal' },
    { value: 'live', label: 'Berlangsung' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Batal' }
  ],
  documentKategori: [
    { value: 'meeting', label: 'Meeting' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'hr', label: 'HR' },
    { value: 'project', label: 'Project' },
    { value: 'finance', label: 'Finance' },
    { value: 'general', label: 'General' }
  ],
  documentStatus: [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'archived', label: 'Archived' }
  ],
  gender: [
    { value: 'L', label: 'Laki-laki' },
    { value: 'P', label: 'Perempuan' }
  ]
};


export const monthOptions = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
];

const karyawanRel = { table: 'karyawan', value: 'id', label: 'nama', activeOnly: true };
const jabatanRel = { table: 'jabatan', value: 'id', label: 'nama_jabatan' };

export const modules: ModuleConfig[] = [
  {
    slug: 'karyawan', table: 'karyawan', title: 'Karyawan', single: 'Karyawan', icon: 'bi-people', menuGroup: 'master',
    description: 'Kelola biodata, jabatan, kontak, bank, dan status karyawan.', exports: true, canShow: true, canEdit: true, canDelete: true, hasCreate: true,
    fields: [
      { name: 'nip', label: 'NIP', type: 'text', required: true, placeholder: 'KRY009' },
      { name: 'nama', label: 'Nama lengkap', type: 'text', required: true },
      { name: 'jabatan_id', label: 'Jabatan', type: 'select', required: true, relation: jabatanRel },
      { name: 'departemen', label: 'Departemen', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'telepon', label: 'Telepon', type: 'text' },
      { name: 'alamat', label: 'Alamat', type: 'textarea' },
      { name: 'tanggal_lahir', label: 'Tanggal lahir', type: 'date' },
      { name: 'jenis_kelamin', label: 'Jenis kelamin', type: 'select', options: statusOptions.gender },
      { name: 'tanggal_masuk', label: 'Tanggal masuk', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: statusOptions.karyawan, defaultValue: 'aktif' },
      { name: 'foto', label: 'Foto karyawan', type: 'file' },
      { name: 'no_ktp', label: 'No. KTP', type: 'text' },
      { name: 'no_bpjs_kesehatan', label: 'No. BPJS Kesehatan', type: 'text' },
      { name: 'no_bpjs_ketenagakerjaan', label: 'No. BPJS Ketenagakerjaan', type: 'text' },
      { name: 'no_rekening', label: 'No. rekening', type: 'text' },
      { name: 'nama_bank', label: 'Nama bank', type: 'text' }
    ],
    columns: [
      { key: 'nip', label: 'NIP' }, { key: 'nama', label: 'Nama' },
      { key: 'jabatan_id', label: 'Jabatan', relation: { table: 'jabatan', key: 'id', label: 'nama_jabatan' } },
      { key: 'departemen', label: 'Departemen' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Status', type: 'status' }
    ],
    searchFields: ['nama', 'nip', 'email', 'departemen'],
    filters: [{ name: 'status', label: 'Status', options: statusOptions.karyawan }]
  },
  {
    slug: 'jabatan', table: 'jabatan', title: 'Jabatan', single: 'Jabatan', icon: 'bi-diagram-3', menuGroup: 'master',
    description: 'Kelola posisi, departemen, deskripsi, dan default gaji pokok.', exports: false, canShow: false, canEdit: true, canDelete: true, hasCreate: true,
    fields: [
      { name: 'nama_jabatan', label: 'Nama jabatan', type: 'text', required: true },
      { name: 'departemen', label: 'Departemen', type: 'text' },
      { name: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
      { name: 'gaji_pokok_default', label: 'Gaji pokok default', type: 'number', min: 0, step: '1000', defaultValue: 0 }
    ],
    columns: [{ key: 'nama_jabatan', label: 'Jabatan' }, { key: 'departemen', label: 'Departemen' }, { key: 'gaji_pokok_default', label: 'Gaji default', type: 'money' }],
    searchFields: ['nama_jabatan', 'departemen']
  },
  {
    slug: 'data-gaji', table: 'data_gaji', title: 'Data Gaji', single: 'Data Gaji', icon: 'bi-cash-coin', menuGroup: 'master',
    description: 'Atur struktur gaji per karyawan: gaji pokok, uang makan harian, transport harian, dan tunjangan harian.', exports: true, canShow: false, canEdit: true, canDelete: true, hasCreate: true,
    fields: [
      { name: 'karyawan_id', label: 'Karyawan', type: 'select', required: true, relation: karyawanRel },
      { name: 'gaji_pokok', label: 'Gaji pokok bulanan', type: 'number', required: true, min: 0, step: '1000', defaultValue: 0 },
      { name: 'uang_makan_harian', label: 'Uang makan per hari', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'transport_harian', label: 'Uang transport per hari', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'tunjangan_harian', label: 'Tunjangan lain per hari', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'bpjs_kesehatan_default', label: 'BPJS kesehatan default', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'bpjs_ketenagakerjaan_default', label: 'BPJS ketenagakerjaan default', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'potongan_lain_default', label: 'Potongan lain default', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'is_active', label: 'Aktif dipakai payroll', type: 'checkbox', defaultValue: true },
      { name: 'catatan', label: 'Catatan struktur gaji', type: 'textarea' }
    ],
    columns: [
      { key: 'karyawan_id', label: 'Karyawan', relation: { table: 'karyawan', key: 'id', label: 'nama' } },
      { key: 'gaji_pokok', label: 'Gaji pokok', type: 'money' },
      { key: 'uang_makan_harian', label: 'Makan/hari', type: 'money' },
      { key: 'transport_harian', label: 'Transport/hari', type: 'money' },
      { key: 'tunjangan_harian', label: 'Lain/hari', type: 'money' },
      { key: 'is_active', label: 'Status', type: 'boolean' }
    ],
    searchFields: ['catatan']
  },

  {
    slug: 'tugas', table: 'tugas', title: 'Tugas', single: 'Tugas', icon: 'bi-kanban', menuGroup: 'operasional',
    description: 'Kelola tugas, deadline, prioritas, status, progress, dan catatan.', exports: true, canShow: true, canEdit: true, canDelete: true, hasCreate: true,
    fields: [
      { name: 'judul', label: 'Judul tugas', type: 'text', required: true },
      { name: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
      { name: 'karyawan_id', label: 'Penanggung jawab', type: 'select', required: true, relation: karyawanRel },
      { name: 'prioritas', label: 'Prioritas', type: 'select', options: statusOptions.prioritasTugas, defaultValue: 'sedang' },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions.tugas, defaultValue: 'pending', editOnly: true },
      { name: 'deadline', label: 'Deadline', type: 'date' },
      { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100, defaultValue: 0, editOnly: true },
      { name: 'catatan', label: 'Catatan', type: 'textarea' }
    ],
    columns: [
      { key: 'judul', label: 'Judul' }, { key: 'karyawan_id', label: 'Penanggung jawab', relation: { table: 'karyawan', key: 'id', label: 'nama' } },
      { key: 'deadline', label: 'Deadline', type: 'date' }, { key: 'prioritas', label: 'Prioritas', type: 'status' }, { key: 'progress', label: 'Progress', type: 'progress' }, { key: 'status', label: 'Status', type: 'status' }
    ],
    searchFields: ['judul', 'deskripsi'],
    filters: [{ name: 'status', label: 'Status', options: statusOptions.tugas }, { name: 'prioritas', label: 'Prioritas', options: statusOptions.prioritasTugas }]
  },
  {
    slug: 'absensi', table: 'absensi', title: 'Absensi', single: 'Absensi', icon: 'bi-calendar-check', menuGroup: 'operasional',
    description: 'Kelola absensi harian, jam masuk, jam keluar, dan status kehadiran.', exports: true, canShow: false, canEdit: true, canDelete: true, hasCreate: true, monthly: true,
    fields: [
      { name: 'karyawan_id', label: 'Karyawan', type: 'select', required: true, relation: karyawanRel },
      { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
      { name: 'jam_masuk', label: 'Jam masuk', type: 'time' },
      { name: 'jam_keluar', label: 'Jam keluar', type: 'time' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: statusOptions.absensi, defaultValue: 'hadir' },
      { name: 'keterangan', label: 'Keterangan', type: 'textarea' }
    ],
    columns: [
      { key: 'tanggal', label: 'Tanggal', type: 'date' }, { key: 'karyawan_id', label: 'Karyawan', relation: { table: 'karyawan', key: 'id', label: 'nama' } },
      { key: 'jam_masuk', label: 'Masuk', type: 'time' }, { key: 'jam_keluar', label: 'Keluar', type: 'time' }, { key: 'status', label: 'Status', type: 'status' }, { key: 'keterangan', label: 'Keterangan' }
    ],
    searchFields: ['keterangan'], filters: [{ name: 'status', label: 'Status', options: statusOptions.absensi }]
  },
  {
    slug: 'absensi-bulanan', table: 'absensi_bulanan', title: 'Absensi Bulanan', single: 'Absensi Bulanan', icon: 'bi-calendar2-week', menuGroup: 'operasional',
    description: 'Input rekap absensi per karyawan dalam 1 bulan: hadir, izin, sakit, alpha, cuti, dan keterangan.', exports: true, canShow: false, canEdit: true, canDelete: true, hasCreate: true, monthly: true,
    fields: [
      { name: 'karyawan_id', label: 'Karyawan', type: 'select', required: true, relation: karyawanRel },
      { name: 'bulan', label: 'Bulan', type: 'select', required: true, options: monthOptions },
      { name: 'tahun', label: 'Tahun', type: 'number', required: true, min: 2020 },
      { name: 'total_hadir', label: 'Total hadir', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_izin', label: 'Total izin', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_sakit', label: 'Total sakit', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_alpha', label: 'Total alpha', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_cuti', label: 'Total cuti', type: 'number', min: 0, defaultValue: 0 },
      { name: 'keterangan', label: 'Keterangan bulanan', type: 'textarea', placeholder: 'Contoh: rekap manual HRD / hasil sinkron absensi QR.' }
    ],
    columns: [
      { key: 'karyawan_id', label: 'Karyawan', relation: { table: 'karyawan', key: 'id', label: 'nama' } },
      { key: 'bulan', label: 'Periode', type: 'month' },
      { key: 'total_hadir', label: 'Hadir' },
      { key: 'total_izin', label: 'Izin' },
      { key: 'total_sakit', label: 'Sakit' },
      { key: 'total_alpha', label: 'Alpha' },
      { key: 'total_cuti', label: 'Cuti' }
    ],
    searchFields: ['keterangan']
  },

  {
    slug: 'cuti', table: 'cuti', title: 'Cuti', single: 'Pengajuan cuti', icon: 'bi-suitcase-lg', menuGroup: 'operasional',
    description: 'Kelola pengajuan cuti karyawan dan proses approve/reject.', exports: true, canShow: true, canEdit: false, canDelete: true, hasCreate: true,
    fields: [
      { name: 'karyawan_id', label: 'Karyawan', type: 'select', required: true, relation: karyawanRel },
      { name: 'jenis_cuti', label: 'Jenis cuti', type: 'select', required: true, options: statusOptions.cutiJenis, defaultValue: 'tahunan' },
      { name: 'tanggal_mulai', label: 'Tanggal mulai', type: 'date', required: true },
      { name: 'tanggal_selesai', label: 'Tanggal selesai', type: 'date', required: true },
      { name: 'alasan', label: 'Alasan', type: 'textarea', required: true }
    ],
    columns: [
      { key: 'karyawan_id', label: 'Karyawan', relation: { table: 'karyawan', key: 'id', label: 'nama' } }, { key: 'jenis_cuti', label: 'Jenis', type: 'status' },
      { key: 'tanggal_mulai', label: 'Mulai', type: 'date' }, { key: 'tanggal_selesai', label: 'Selesai', type: 'date' }, { key: 'jumlah_hari', label: 'Hari' }, { key: 'status', label: 'Status', type: 'status' }
    ],
    searchFields: ['alasan'], filters: [{ name: 'status', label: 'Status', options: statusOptions.requestStatus }, { name: 'jenis_cuti', label: 'Jenis', options: statusOptions.cutiJenis }]
  },
  {
    slug: 'pengumuman', table: 'pengumuman', title: 'Pengumuman', single: 'Pengumuman', icon: 'bi-megaphone', menuGroup: 'operasional',
    description: 'Kelola informasi internal, prioritas, tanggal aktif, dan status publikasi.', exports: false, canShow: false, canEdit: true, canDelete: true, hasCreate: true,
    fields: [
      { name: 'judul', label: 'Judul', type: 'text', required: true },
      { name: 'isi', label: 'Isi pengumuman', type: 'textarea', required: true },
      { name: 'prioritas', label: 'Prioritas', type: 'select', options: statusOptions.pengumuman, defaultValue: 'normal' },
      { name: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
      { name: 'tanggal_mulai', label: 'Tanggal mulai', type: 'date' },
      { name: 'tanggal_selesai', label: 'Tanggal selesai', type: 'date' }
    ],
    columns: [{ key: 'judul', label: 'Judul' }, { key: 'prioritas', label: 'Prioritas', type: 'status' }, { key: 'is_active', label: 'Aktif', type: 'boolean' }, { key: 'tanggal_selesai', label: 'Sampai', type: 'date' }],
    searchFields: ['judul', 'isi'], filters: [{ name: 'prioritas', label: 'Prioritas', options: statusOptions.pengumuman }]
  },

  {
    slug: 'gaji', table: 'gaji', title: 'Penggajian', single: 'Gaji', icon: 'bi-cash-stack', menuGroup: 'keuangan',
    description: 'Kelola gaji bulanan, pendapatan, potongan, status, dan slip gaji.', exports: true, canShow: true, canEdit: true, canDelete: true, hasCreate: true, monthly: true,
    fields: [
      { name: 'karyawan_id', label: 'Karyawan', type: 'select', required: true, relation: karyawanRel },
      { name: 'bulan', label: 'Bulan', type: 'select', required: true, options: monthOptions },
      { name: 'tahun', label: 'Tahun', type: 'number', required: true, min: 2020 },
      { name: 'total_hadir', label: 'Total kehadiran 1 bulan', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_izin', label: 'Total izin', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_sakit', label: 'Total sakit', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_alpha', label: 'Total alpha', type: 'number', min: 0, defaultValue: 0 },
      { name: 'total_cuti', label: 'Total cuti', type: 'number', min: 0, defaultValue: 0 },
      { name: 'gaji_pokok', label: 'Gaji pokok bulanan', type: 'number', required: true, min: 0, step: '1000' },
      { name: 'tarif_uang_makan_harian', label: 'Tarif makan per hari', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'tarif_transport_harian', label: 'Tarif transport per hari', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'tarif_lain_harian', label: 'Tarif lain per hari', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'insentif', label: 'Insentif', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'bonus', label: 'Bonus', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'tunjangan', label: 'Tunjangan tetap', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'thr', label: 'THR', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'tunjangan_lain', label: 'Tunjangan lain bulanan', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'bpjs_kesehatan', label: 'BPJS Kesehatan', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'bpjs_ketenagakerjaan', label: 'BPJS Ketenagakerjaan', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'potongan_kasbon', label: 'Potongan kasbon', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'potongan_lain', label: 'Potongan lain', type: 'number', min: 0, step: '1000', defaultValue: 0 },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions.gaji, defaultValue: 'draft', editOnly: true },
      { name: 'catatan', label: 'Catatan', type: 'textarea' }
    ],
    columns: [
      { key: 'karyawan_id', label: 'Karyawan', relation: { table: 'karyawan', key: 'id', label: 'nama' } }, { key: 'bulan', label: 'Periode', type: 'month' },
      { key: 'total_hadir', label: 'Hadir' }, { key: 'uang_makan', label: 'Makan', type: 'money' }, { key: 'transport', label: 'Transport', type: 'money' },
      { key: 'total_pendapatan', label: 'Pendapatan', type: 'money' }, { key: 'total_potongan', label: 'Potongan', type: 'money' }, { key: 'gaji_bersih', label: 'Gaji bersih', type: 'money' }, { key: 'status', label: 'Status', type: 'status' }
    ],
    searchFields: ['catatan'], filters: [{ name: 'status', label: 'Status', options: statusOptions.gaji }]
  },
  {
    slug: 'kasbon', table: 'kasbon', title: 'Kasbon', single: 'Kasbon', icon: 'bi-wallet2', menuGroup: 'keuangan',
    description: 'Kelola pinjaman karyawan, jatuh tempo, cicilan, status, dan sisa kasbon.', exports: true, canShow: true, canEdit: true, canDelete: true, hasCreate: true,
    fields: [
      { name: 'karyawan_id', label: 'Karyawan', type: 'select', required: true, relation: karyawanRel },
      { name: 'jumlah', label: 'Jumlah kasbon', type: 'number', required: true, min: 1, step: '1000' },
      { name: 'tanggal_pinjam', label: 'Tanggal pinjam', type: 'date', required: true },
      { name: 'tanggal_jatuh_tempo', label: 'Tanggal jatuh tempo', type: 'date' },
      { name: 'cicilan_bulan', label: 'Cicilan bulan', type: 'number', required: true, min: 1, max: 24, defaultValue: 1 },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions.kasbon, defaultValue: 'pending', editOnly: true },
      { name: 'keperluan', label: 'Keperluan', type: 'textarea' },
      { name: 'catatan', label: 'Catatan', type: 'textarea' }
    ],
    columns: [
      { key: 'karyawan_id', label: 'Karyawan', relation: { table: 'karyawan', key: 'id', label: 'nama' } }, { key: 'jumlah', label: 'Jumlah', type: 'money' },
      { key: 'sisa', label: 'Sisa', type: 'money' }, { key: 'cicilan_per_bulan', label: 'Cicilan/bln', type: 'money' }, { key: 'tanggal_pinjam', label: 'Tanggal', type: 'date' }, { key: 'status', label: 'Status', type: 'status' }
    ],
    searchFields: ['keperluan', 'catatan'], filters: [{ name: 'status', label: 'Status', options: statusOptions.kasbon }]
  }
];

export function getModule(slug: string) {
  return modules.find((m) => m.slug === slug);
}

export function moduleSlugs() {
  return modules.map((m) => m.slug);
}

export const relatedTables = ['jabatan', 'karyawan', 'users', 'data_gaji', 'absensi_bulanan'];
