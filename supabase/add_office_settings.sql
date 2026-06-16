-- OPTIONAL PATCH: jalankan file ini kalau database kamu sudah berisi data lama
-- dan tidak mau reset_database.sql.

create table if not exists public.office_settings (
  id bigint primary key default 1 check (id = 1),
  office_name text not null default 'AlmerDev Technology',
  panel_name text default 'Office OS',
  tagline text,
  email text,
  phone text,
  address text,
  website text,
  city text,
  work_hours text,
  footer_note text,
  accent_color text not null default '#2563eb',
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.office_settings (id, office_name, panel_name, tagline, email, phone, address, website, city, work_hours, footer_note, accent_color, logo)
values (1, 'AlmerDev Technology', 'Office OS', 'Sistem administrasi kantor yang rapi, cepat, dan siap produksi.', 'admin@kantor.com', '0812-3456-7890', 'Jakarta, Indonesia', '', 'Jakarta', 'Senin - Jumat, 08.00 - 17.00', 'Panel kantor siap produksi.', '#2563eb', null)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('office-files', 'office-files', true)
on conflict (id) do update set public = true;

-- Buat trigger updated_at kalau function set_updated_at sudah ada.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_office_settings_updated_at on public.office_settings;
    create trigger trg_office_settings_updated_at
    before update on public.office_settings
    for each row execute function public.set_updated_at();
  end if;
end $$;
