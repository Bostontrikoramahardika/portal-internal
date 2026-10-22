-- Tabel rencana MPP per site / tahun / bulan / jabatan
-- Tidak mengubah tabel lain.

create table if not exists public.mpp_plan (
  id uuid primary key default gen_random_uuid(),
  site text not null default 'PPA-MLP',
  tahun int not null,
  bulan int not null,
  grup text not null,
  jabatan text not null,
  mpp numeric not null default 0,
  unit numeric,
  shift numeric,
  faktor numeric,
  rumus text not null default 'manual',
  updated_at timestamptz default now(),
  updated_by text
);

create unique index if not exists mpp_plan_unik
  on public.mpp_plan (site, tahun, bulan, jabatan);
