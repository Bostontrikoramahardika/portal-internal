-- ═══════════════════════════════════════════════════════════
-- KOMPENSASI CUTI — input manual HR per karyawan per bulan
-- Jalankan SEKALI di Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

create table if not exists public.kompensasi_cuti (
  id           uuid primary key default gen_random_uuid(),
  nrp          text        not null,
  periode      text        not null,             -- format 'YYYY-MM', contoh '2026-10'
  jumlah_hari  numeric(5,1) not null default 0,  -- boleh 0.5 untuk setengah hari
  keterangan   text,
  diubah_oleh  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- satu baris per karyawan per bulan
create unique index if not exists kompensasi_cuti_unik
  on public.kompensasi_cuti (nrp, periode);

create index if not exists kompensasi_cuti_periode
  on public.kompensasi_cuti (periode);

-- trigger updated_at otomatis
create or replace function public.kompensasi_cuti_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_kompensasi_cuti_touch on public.kompensasi_cuti;
create trigger trg_kompensasi_cuti_touch
  before update on public.kompensasi_cuti
  for each row execute function public.kompensasi_cuti_touch();

-- izin akses (kalau RLS aktif di project Anda)
alter table public.kompensasi_cuti enable row level security;

drop policy if exists "kompensasi_cuti_service" on public.kompensasi_cuti;
create policy "kompensasi_cuti_service"
  on public.kompensasi_cuti
  for all
  using (true)
  with check (true);
-- Catatan: aplikasi mengakses tabel ini lewat service role (server),
-- jadi policy di atas hanya jaring pengaman. Kalau tidak mau RLS aktif,
-- cukup jalankan: alter table public.kompensasi_cuti disable row level security;
