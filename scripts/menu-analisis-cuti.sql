-- ============================================================
-- MENU: ANALISIS CUTI
-- Halaman: /dashboard/analisis-cuti
-- Jalankan di Supabase → SQL Editor
--
-- PENTING: jalankan LANGKAH 1 dulu untuk melihat nama kolom
-- tabel `menus` yang benar di database Bapak. Kalau ada kolom
-- yang tidak cocok, hapus baris kolom itu di LANGKAH 2.
-- ============================================================


-- ─────────────────────────────────────────────
-- LANGKAH 1 — lihat struktur tabel menus
-- ─────────────────────────────────────────────
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'menus'
order by ordinal_position;

-- Lihat juga contoh 3 menu yang sudah ada, untuk meniru polanya
select * from public.menus order by menu_key limit 3;


-- ─────────────────────────────────────────────
-- LANGKAH 2 — tambah menu Analisis Cuti
-- role  : siapa yang boleh melihat menu ini
--         'hrga'      = HR site
--         'admin'     = admin sistem
--         'pjo_site'  = PJO & Deputy
-- Ubah / tambah baris role sesuai kebutuhan.
-- ─────────────────────────────────────────────
insert into public.menus
  (menu_key, menu_label, href, icon, role, required_permission, sort_order, active)
values
  ('analisis_cuti', 'Analisis Cuti', '/dashboard/analisis-cuti', '📅', 'hrga',     null, 96, true),
  ('analisis_cuti', 'Analisis Cuti', '/dashboard/analisis-cuti', '📅', 'admin',    null, 96, true),
  ('analisis_cuti', 'Analisis Cuti', '/dashboard/analisis-cuti', '📅', 'pjo_site', null, 96, true);


-- ─────────────────────────────────────────────
-- LANGKAH 3 — verifikasi
-- ─────────────────────────────────────────────
select menu_key, menu_label, href, role, required_permission, active
from public.menus
where menu_key = 'analisis_cuti';


-- ─────────────────────────────────────────────
-- ROLLBACK — kalau mau membatalkan
-- ─────────────────────────────────────────────
-- delete from public.menus where menu_key = 'analisis_cuti';


-- ============================================================
-- CATATAN HAK AKSES
-- ============================================================
-- 1. Kalau `required_permission` DIISI  → role diabaikan,
--    yang dicek adalah izin di tabel user_permissions.
-- 2. Kalau `required_permission` KOSONG → role yang menentukan
--    (sesuai app/api/menus/route.ts).
-- 3. Pilihan di atas memakai cara kedua (berbasis role) supaya
--    tidak perlu menambah izin baru ke puluhan karyawan.
-- 4. Kalau nanti ingin lebih ketat, buat izin baru dulu:
--      insert into public.user_permissions (nrp, perm_key)
--      select nrp, 'cuti_view_all' from public.employees
--       where jabatan in ('PJO','DEP PJO');
--    lalu ubah required_permission menu ini menjadi 'cuti_view_all'.
