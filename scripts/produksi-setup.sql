-- ═══════════════════════════════════════════════════════════════
-- 📈 MODUL PRODUKSI — Tahap 1: Tabel + Konfigurasi + Menu
-- Jalankan di Supabase SQL Editor. Aman diulang (idempoten).
-- ═══════════════════════════════════════════════════════════════

-- 1. TABEL UTAMA: salinan TS Opt (satu baris = 1 unit × 1 shift × 1 tanggal)
create table if not exists ts_opt (
  id uuid primary key default gen_random_uuid(),
  site text not null,
  tanggal date not null,
  shift int not null,                    -- 1 = DS, 2 = NS
  tipe_unit text,
  kode_unit text not null,
  nrp text,
  nama_operator text,
  hm_awal numeric(12,2),
  hm_akhir numeric(12,2),
  hm_total numeric(12,2),
  hm_over numeric(12,2) default 0,
  catatan text,
  dibuat_oleh text,
  dibuat_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (site, tanggal, shift, kode_unit)
);
create index if not exists idx_ts_opt_site_tanggal on ts_opt (site, tanggal);

-- 2. TARGET BULANAN (ditetapkan manual per site + bulan, sesuai Excel)
create table if not exists ts_target (
  id uuid primary key default gen_random_uuid(),
  site text not null,
  bulan text not null,                   -- format: YYYY-MM
  target_jam numeric(12,2) not null,
  faktor numeric(5,2) default 88,        -- % penyesuaian "Tersisa" (di Excel: 88%)
  dibuat_oleh text,
  dibuat_at timestamptz default now(),
  unique (site, bulan)
);

-- 3. KONFIGURASI UNIT: kelompok EGI + fuel plan (dari Laporan Produksi Excel)
create table if not exists ts_unit_config (
  kode_unit text primary key,
  egi text,                              -- PC200SPR / PC200RB / D65 / D85 / GD705
  jenis text,                            -- Excavator / Bulldozer / Grader
  fuel_lph numeric(8,2)                  -- liter per jam (fuel plan)
);

insert into ts_unit_config (kode_unit, egi, jenis, fuel_lph) values
  ('GD 701 B', 'GD705',   'Grader',    13.0),
  ('D 6502 B', 'D65',     'Bulldozer', 23.3),
  ('E 203 B',  'PC200SPR','Excavator', 16.1),
  ('E 210 B',  'PC200SPR','Excavator', 15.6),
  ('E 208 B',  'PC200SPR','Excavator', 15.2),
  ('E 205 B',  'PC200RB', 'Excavator', null),
  ('E 206 B',  'PC200RB', 'Excavator', null),
  ('E 207 B',  'PC200RB', 'Excavator', null)
on conflict (kode_unit) do nothing;

-- 4. MENU: Laporan Produksi (grup baru "Produksi")
insert into menus (id, role, menu_key, menu_label, menu_icon, menu_group,
                   access_mode, nav_tab, href, sort_order, active)
select gen_random_uuid(), r.role, 'produksi_dashboard', 'Laporan Produksi', '📈', 'Produksi',
       'DASHBOARD', 'more', '/dashboard/produksi', 5, true
from (values ('super_admin'), ('director_ops'), ('business_dev'), ('manager_ops'),
             ('hr_ho'), ('hr_site'), ('admin_site'), ('pjo_site'), ('gl_produksi')) as r(role)
where not exists (
  select 1 from menus where menu_key = 'produksi_dashboard' and menus.role = r.role
);

-- 5. VERIFIKASI
select 'ts_opt' tabel, count(*) baris from ts_opt
union all select 'ts_target', count(*) from ts_target
union all select 'ts_unit_config', count(*) from ts_unit_config
union all select 'menus produksi', count(*) from menus where menu_key = 'produksi_dashboard';

-- ═══ TAMBAHAN v3 (kolom PA/MA/UA/standby) — aman diulang ═══
alter table ts_opt add column if not exists hm_kerja numeric(12,2);
alter table ts_opt add column if not exists standby numeric(12,2);
alter table ts_opt add column if not exists pa numeric(6,2);
alter table ts_opt add column if not exists ma numeric(6,2);
alter table ts_opt add column if not exists ua numeric(6,2);
