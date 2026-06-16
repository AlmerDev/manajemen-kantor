-- Tambahan untuk database yang sudah jalan.
-- Jalankan file ini di Supabase SQL Editor supaya Absensi Bulanan otomatis ikut update
-- setiap ada insert/update/delete di Absensi Harian.

create or replace function public.refresh_absensi_bulanan_manual(p_karyawan_id bigint, p_tanggal date)
returns void as $$
declare
  target_bulan int;
  target_tahun int;
begin
  if p_karyawan_id is null or p_tanggal is null then
    return;
  end if;

  target_bulan := extract(month from p_tanggal)::int;
  target_tahun := extract(year from p_tanggal)::int;

  insert into public.absensi_bulanan (
    karyawan_id,
    bulan,
    tahun,
    total_hadir,
    total_izin,
    total_sakit,
    total_alpha,
    total_cuti,
    keterangan,
    updated_at
  )
  select
    p_karyawan_id,
    target_bulan,
    target_tahun,
    count(*) filter (where status = 'hadir')::int,
    count(*) filter (where status = 'izin')::int,
    count(*) filter (where status = 'sakit')::int,
    count(*) filter (where status = 'alpha')::int,
    count(*) filter (where status = 'cuti')::int,
    'Rekap otomatis dari absensi harian.',
    now()
  from public.absensi
  where karyawan_id = p_karyawan_id
    and tanggal >= make_date(target_tahun, target_bulan, 1)
    and tanggal < (make_date(target_tahun, target_bulan, 1) + interval '1 month')::date
  on conflict (karyawan_id, bulan, tahun) do update set
    total_hadir = excluded.total_hadir,
    total_izin = excluded.total_izin,
    total_sakit = excluded.total_sakit,
    total_alpha = excluded.total_alpha,
    total_cuti = excluded.total_cuti,
    keterangan = excluded.keterangan,
    updated_at = now();
end;
$$ language plpgsql;

create or replace function public.refresh_absensi_bulanan_from_harian()
returns trigger as $$
begin
  perform public.refresh_absensi_bulanan_manual(coalesce(new.karyawan_id, old.karyawan_id), coalesce(new.tanggal, old.tanggal));

  if tg_op = 'UPDATE' and (old.karyawan_id is distinct from new.karyawan_id or old.tanggal is distinct from new.tanggal) then
    perform public.refresh_absensi_bulanan_manual(old.karyawan_id, old.tanggal);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_absensi_sync_bulanan on public.absensi;
create trigger trg_absensi_sync_bulanan
after insert or update or delete on public.absensi
for each row execute function public.refresh_absensi_bulanan_from_harian();

-- Sinkron ulang data yang sudah ada.
select public.refresh_absensi_bulanan_manual(karyawan_id, tanggal)
from public.absensi
group by karyawan_id, tanggal;
