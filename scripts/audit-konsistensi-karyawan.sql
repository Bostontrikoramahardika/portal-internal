-- ============================================================
-- AUDIT KONSISTENSI ROLE & IZIN SELURUH KARYAWAN
-- 25 Oktober 2026 — Portal Internal BTM
-- ============================================================
-- Tujuan: memastikan SEMUA karyawan mendapat perlakuan yang sama
-- sesuai rolenya, dan menemukan pengecualian yang perlu dibetulkan.
--
-- Semua query di bawah hanya MEMBACA. Tidak mengubah apa pun.
-- ============================================================


-- ============================================================
-- 1. RINGKASAN: berapa karyawan per status & per role
-- ============================================================
select coalesce(e.status_karyawan, '(kosong)') as status,
       count(*) as jumlah
  from public.employees e
 group by 1 order by 2 desc;

select r.role,
       count(distinct r.nrp) as jumlah_orang,
       count(distinct case when e.status_karyawan = 'Aktif' then r.nrp end) as aktif
  from public.roles r
  join public.employees e on e.nrp = r.nrp
 where r.active
 group by r.role order by 2 desc;


-- ============================================================
-- 2. KARYAWAN AKTIF YANG BELUM PUNYA IZIN SAMA SEKALI
-- ============================================================
select e.nrp, e.nama, e.site, e.jabatan
  from public.employees e
 where e.status_karyawan = 'Aktif'
   and not exists (select 1 from public.user_permissions up where up.nrp = e.nrp)
 order by e.nama;
-- HARUS 0 baris.


-- ============================================================
-- 3. IZIN TIDAK SESUAI ROLE (paling penting)
-- ============================================================
-- A. Ada izin yang SEHARUSNYA dimiliki (ada di template role-nya) tetapi BELUM ada.
select e.nrp, e.nama,
       coalesce(string_agg(distinct r.role, ', '), '(tanpa role)') as roles,
       tp.perm_key as izin_yang_kurang
  from public.employees e
  join public.roles r on r.nrp = e.nrp and r.active
  join public.role_template_permissions tp on tp.role_key = r.role
 where e.status_karyawan = 'Aktif'
   and not exists (select 1 from public.user_permissions up
                    where up.nrp = e.nrp and up.perm_key = tp.perm_key)
 group by e.nrp, e.nama, tp.perm_key
 order by e.nama, tp.perm_key;
-- HARUS 0 baris. Kalau ada -> ada orang yang kehilangan menu yang seharusnya dia lihat.

-- B. Izin dasar 'karyawan' (diberikan ke semua orang) belum dimiliki.
select e.nrp, e.nama, tp.perm_key as izin_yang_kurang
  from public.employees e
  cross join public.role_template_permissions tp
 where tp.role_key = 'karyawan'
   and e.status_karyawan = 'Aktif'
   and not exists (select 1 from public.user_permissions up
                    where up.nrp = e.nrp and up.perm_key = tp.perm_key)
 order by e.nama, tp.perm_key;
-- HARUS 0 baris.


-- ============================================================
-- 4. IZIN BERLEBIH (tidak berasal dari role mana pun)
-- ============================================================
-- Orang memegang izin, tetapi tidak ada satu pun role-nya yang
-- memberikan izin itu. Bisa sengaja (diberi per orang) atau sisa lama.
select e.nrp, e.nama,
       coalesce(string_agg(distinct r.role, ', '), '(tanpa role)') as roles,
       up.perm_key
  from public.user_permissions up
  join public.employees e on e.nrp = up.nrp
  left join public.roles r on r.nrp = up.nrp and r.active
 where not exists (
        select 1 from public.roles r2
          join public.role_template_permissions tp
            on tp.role_key = r2.role and tp.perm_key = up.perm_key
         where r2.nrp = up.nrp and r2.active
       )
   and up.perm_key not in (
        select perm_key from public.role_template_permissions where role_key = 'karyawan'
       )
 order by e.nama, up.perm_key;
-- Kalau kosong -> semua izin berasal dari role. Itu kondisi paling rapi.


-- ============================================================
-- 5. HAK NAUP: izin global milik role site
-- ============================================================
-- Orang yang rolenya hanya role-site TIDAK boleh memegang izin lintas site.
select up.perm_key, e.nama,
       coalesce(string_agg(distinct r.role, ', '), '(tanpa role)') as roles
  from public.user_permissions up
  join public.employees e on e.nrp = up.nrp
  left join public.roles r on r.nrp = up.nrp and r.active
 where (up.perm_key like '%_all' or up.perm_key like '%_all_sites')
   and not exists (
        select 1 from public.roles r3
         where r3.nrp = up.nrp and r3.active
           and r3.role in ('hr_ho','manager_ops','business_dev','spv_she_ho',
                          'director_ops','super_admin','hrga','hrga_pusat')
       )
 order by e.nama, up.perm_key;
-- HARUS 0 baris.


-- ============================================================
-- 6. KARYAWAN AKTIF TANPA ROLE DI TABEL roles
-- ============================================================
-- Mereka hanya dapat 10 izin dasar dari role 'karyawan' otomatis.
-- Bukan kesalahan, tetapi perlu diketahui.
select e.nrp, e.nama, e.site, e.jabatan
  from public.employees e
 where e.status_karyawan = 'Aktif'
   and not exists (select 1 from public.roles r where r.nrp = e.nrp and r.active)
 order by e.site, e.nama;


-- ============================================================
-- 7. DATA KARYAWAN YANG MERAGUKAN
-- ============================================================
-- A. Site kosong
select nrp, nama, status_karyawan from public.employees
 where coalesce(trim(site),'') = '' order by nama;

-- B. Site tidak ada di daftar site resmi
select e.nrp, e.nama, e.site
  from public.employees e
 where coalesce(trim(e.site),'') <> ''
   and not exists (select 1 from public.sites s where s.nama_site = e.site)
 order by e.site, e.nama;

-- C. NRP kembar (tanpa huruf B di depan)
select regexp_replace(upper(trim(nrp)), '^B', '') as nrp_dasar,
       count(*) as jumlah,
       string_agg(nrp || ' (' || coalesce(status_karyawan,'-') || ')', ', ' order by nrp) as daftar
  from public.employees
 group by 1 having count(*) > 1
 order by 1;

-- D. Nama kembar dengan NRP berbeda (kemungkinan dobel input)
select upper(trim(nama)) as nama, count(*) as jumlah,
       string_agg(nrp || ' (' || coalesce(status_karyawan,'-') || ')', ', ' order by nrp) as daftar
  from public.employees
 where status_karyawan = 'Aktif'
 group by 1 having count(*) > 1
 order by 1;

-- E. Aktif tetapi sudah punya tanggal keluar
select nrp, nama, tanggal_resign, tanggal_keluar, status_karyawan
  from public.employees
 where status_karyawan = 'Aktif'
   and (tanggal_resign is not null or tanggal_keluar is not null)
 order by nama;


-- ============================================================
-- 8. EKSPOR UNTUK DIPERIKSA DI EXCEL
-- ============================================================
select e.nrp, e.nama, e.site, e.status_karyawan,
       coalesce(string_agg(distinct r.role, ', ' order by r.role), '-') as roles,
       count(distinct up.perm_key) as jumlah_izin,
       coalesce(string_agg(distinct up.perm_key, ', '), '-') as daftar_izin
  from public.employees e
  left join public.roles r on r.nrp = e.nrp and r.active
  left join public.user_permissions up on up.nrp = e.nrp
 group by e.nrp, e.nama, e.site, e.status_karyawan
 order by e.status_karyawan, e.nama;


-- ============================================================
-- 9. PERBAIKAN (jalankan HANYA jika bagian 3 di atas ada isinya)
-- ============================================================
-- Menyamakan izin semua karyawan aktif dengan template role-nya.
-- Hanya MENAMBAH izin yang kurang. Tidak pernah menghapus izin.
begin;

-- 9a. Cabut-cadangan dulu (aman, bisa dibandingkan)
create table if not exists public.user_permissions_backup_20261025 as
  select * from public.user_permissions;

-- 9b. Tambah izin dari role yang dimiliki (tabel roles)
insert into public.user_permissions (nrp, perm_key)
select distinct r.nrp, tp.perm_key
  from public.roles r
  join public.role_template_permissions tp on tp.role_key = r.role
  join public.employees e on e.nrp = r.nrp and e.status_karyawan = 'Aktif'
 where r.active
on conflict do nothing;

-- 9c. Tambah 10 izin dasar role 'karyawan' untuk semua karyawan aktif
insert into public.user_permissions (nrp, perm_key)
select e.nrp, tp.perm_key
  from public.employees e
  cross join public.role_template_permissions tp
 where tp.role_key = 'karyawan'
   and e.status_karyawan = 'Aktif'
on conflict do nothing;

-- 9d. OPSIONAL — jangan dijalankan sebelum hasil bagian 5 diperiksa satu per satu.
--     Baris di bawah masih berupa komentar supaya tidak terhapus tanpa sengaja.
--     Kalau bagian 5 benar-benar kosong, tidak perlu dijalankan sama sekali.
--
-- delete from public.user_permissions up
--  where (up.perm_key like '%_all' or up.perm_key like '%_all_sites')
--    and not exists (
--         select 1 from public.roles r
--          where r.nrp = up.nrp and r.active
--            and r.role in ('hr_ho','manager_ops','business_dev','spv_she_ho',
--                           'director_ops','super_admin','hrga','hrga_pusat')
--        );

commit;

-- Setelah commit, JALANKAN LAGI bagian 2, 3, dan 5.
-- Harapan: bagian 2 = 0 baris, bagian 3 = 0 baris, bagian 5 = 0 baris.
