-- ═══════════════════════════════════════════════════════════════
-- PRODUKSI — acuan PA/MA (satu angka site, bukan per unit)
-- Jalankan di Supabase SQL Editor. Aman diulang.
-- Tidak mengubah role / permission / menu.
-- ═══════════════════════════════════════════════════════════════

alter table ts_target add column if not exists pa_target numeric(6,2) default 90;
alter table ts_target add column if not exists ma_target numeric(6,2) default 92;

comment on column ts_target.pa_target is 'Acuan PA site (%). Default 90. UA tidak diisi — dipantau.';
comment on column ts_target.ma_target is 'Acuan MA site (%). Default 92.';

-- Isi default untuk baris target yang sudah ada
update ts_target set pa_target = 90 where pa_target is null;
update ts_target set ma_target = 92 where ma_target is null;
