-- ============================================================
-- REVISI MENU CUTI
-- 1. Nama menu utama "Cuti (Admin)"  →  "Cuti Karyawan"
-- 2. Hapus tab DASHBOARD
-- 3. Hapus tab MONITORING  (fungsinya sudah pindah ke tab KELOLA)
--
-- Jalankan LANGKAH 1 dulu, kirim hasilnya kalau ada yang aneh.
-- Semua perintah aman dijalankan berulang.
-- ============================================================


-- ─────────────────────────────────────────────
-- LANGKAH 1 — LIHAT SUSUNAN MENU CUTI SEKARANG
-- ─────────────────────────────────────────────
select id, role, menu_key, menu_label, parent_menu_key,
       sort_order, href, active
from public.menus
where menu_key in ('kelola_cuti', 'kelola_hak_cuti')
   or parent_menu_key in ('kelola_cuti', 'kelola_hak_cuti')
order by parent_menu_key nulls first, sort_order;


-- ─────────────────────────────────────────────
-- LANGKAH 2 — GANTI NAMA MENJADI "Cuti Karyawan"
-- (menu utama di sidebar + induk tab)
-- ─────────────────────────────────────────────
update public.menus
   set menu_label = 'Cuti Karyawan'
 where menu_key = 'kelola_cuti';

-- kalau nama lamanya bukan di 'kelola_cuti', pakai ini:
-- update public.menus
--    set menu_label = 'Cuti Karyawan'
--  where menu_label ilike '%cuti (admin)%';


-- ─────────────────────────────────────────────
-- LANGKAH 3 — HAPUS TAB "DASHBOARD" & "MONITORING"
-- Dihapus hanya anak-anak dari menu Cuti, tidak menyentuh menu lain.
-- ─────────────────────────────────────────────
delete from public.menus m
 using (select menu_key
          from public.menus
         where menu_key in ('kelola_cuti', 'kelola_hak_cuti')) i
 where m.parent_menu_key = i.menu_key
   and upper(trim(m.menu_label)) in ('MONITORING',
                                     'DASHBOARD',
                                     'DASHBOARD CUTI',
                                     'MONITORING CUTI TIKET');


-- ─────────────────────────────────────────────
-- LANGKAH 4 — CEK HASIL
-- Sisa tab harusnya: KELOLA | SALDO & TIKET | ANALISIS
-- ─────────────────────────────────────────────
select role, menu_key, menu_label, parent_menu_key, sort_order, href
from public.menus
where menu_key in ('kelola_cuti', 'kelola_hak_cuti')
   or parent_menu_key in ('kelola_cuti', 'kelola_hak_cuti')
order by parent_menu_key nulls first, sort_order;


-- ============================================================
-- BATALKAN (kalau ada yang salah)
-- ============================================================
-- Nama kembali:
-- update public.menus set menu_label = 'Cuti (Admin)' where menu_key = 'kelola_cuti';

-- Tab kembali (sesuaikan menu_key, label, href dengan hasil LANGKAH 1):
-- insert into public.menus
--   (role, menu_key, menu_label, menu_icon, menu_group, sort_order,
--    active, parent_menu_key, href)
-- values
--   ('hrga', 'monitoring_cuti_tiket', 'MONITORING', '📊', 'HR', 2,
--    true, 'kelola_hak_cuti', '/dashboard/dashboard-cuti');


-- ============================================================
-- CATATAN
-- ============================================================
-- • Setelah LANGKAH 3, tab KELOLA otomatis menjadi halaman
--   "Cuti Karyawan" yang baru (nama, NRP, jabatan, tgl mulai,
--   tgl akhir, total hari, keterangan, cuti tahunan, tiket +
--   tujuan, status approval, tombol Kelola).
-- • Tab SALDO & TIKET tetap ada dan tampilannya sudah disamakan.
-- • Halaman /dashboard/dashboard-cuti tidak dihapus dari kode,
--   jadi kalau nanti mau dipakai lagi cukup tambah baris menu.
