-- ============================================================
-- TUKAR POSISI: TONARA HELIANTUS  <->  ERIK WIDODO
-- 25 Oktober 2026 — Portal Internal BTM
-- ============================================================
-- Permintaan:
--   Tonara Heliantus (1780825) : Deputy PJO     -> GL Produksi
--   Erik Widodo      (2240526) : Production GL  -> Deputy PJO
--
-- "Deputy PJO" memakai role yang sama dengan PJO, yaitu pjo_site
-- (keputusan sebelumnya: tidak dibuat role baru untuk Deputy).
--
-- Yang diubah:
--   1. employees.jabatan + employees.departemen
--   2. roles            -> role lama dinonaktifkan, role baru ditambahkan
--   3. user_permissions -> izin role lama dicabut, izin role baru disalin
--   4. approval_matrix  -> (BAGIAN 3) tukar rujukan atasan/pjo
--
-- Aman: ada cadangan, dibungkus begin/commit, dan role lama hanya
-- dinonaktifkan (active=false) — tidak dihapus, jadi bisa dikembalikan.
--
-- JALANKAN BERURUTAN: BAGIAN 1 -> 2 -> 3 (kalau perlu) -> 4
-- ============================================================


-- ============================================================
-- BAGIAN 1 — LIHAT DULU (tidak mengubah apa pun)
-- ============================================================

-- 1a. Keadaan sekarang
select e.nrp, e.nama, e.jabatan, e.departemen, e.site, e.status_karyawan,
       coalesce(string_agg(r.role || case when r.active then '' else ' (nonaktif)' end, ', '), '(tanpa role)') as roles,
       (select count(*) from public.user_permissions up where up.nrp = e.nrp) as jumlah_izin
  from public.employees e
  left join public.roles r on r.nrp = e.nrp
 where e.nrp in ('1780825', '2240526')
 group by e.nrp, e.nama, e.jabatan, e.departemen, e.site, e.status_karyawan
 order by e.nama;

-- 1b. Apakah keduanya dirujuk di matriks persetujuan?
--     (kalau 0 semua, BAGIAN 3 tidak perlu dijalankan)
select 'Tonara jadi atasan'  as keterangan, count(*) as jumlah
  from public.approval_matrix where atasan_nrp = '1780825' and active
union all
select 'Tonara jadi PJO', count(*)
  from public.approval_matrix where pjo_nrp = '1780825' and active
union all
select 'Erik jadi atasan', count(*)
  from public.approval_matrix where atasan_nrp = '2240526' and active
union all
select 'Erik jadi PJO', count(*)
  from public.approval_matrix where pjo_nrp = '2240526' and active
union all
select 'Tonara jadi bawahan (baris miliknya)', count(*)
  from public.approval_matrix where employee_nrp = '1780825' and active
union all
select 'Erik jadi bawahan (baris miliknya)', count(*)
  from public.approval_matrix where employee_nrp = '2240526' and active;


-- ============================================================
-- BAGIAN 2 — TUKAR JABATAN, DEPARTEMEN, ROLE, DAN IZIN
-- ============================================================
begin;

-- 2a. Cadangan
create table if not exists public.employees_backup_tukar_20261025 as
  select * from public.employees;
create table if not exists public.roles_backup_tukar_20261025 as
  select * from public.roles;
create table if not exists public.user_permissions_backup_tukar_20261025 as
  select * from public.user_permissions;

-- 2b. Jabatan & departemen
update public.employees
   set jabatan = 'Production GL', departemen = 'Produksi'
 where nrp = '1780825';          -- Tonara -> GL Produksi

update public.employees
   set jabatan = 'Deputy PJO', departemen = 'Site Management'
 where nrp = '2240526';          -- Erik -> Deputy PJO

-- 2c. Role lama dinonaktifkan (tidak dihapus, bisa dikembalikan)
update public.roles
   set active = false
 where nrp = '1780825' and role = 'pjo_site';

update public.roles
   set active = false
 where nrp = '2240526' and role = 'gl_produksi';

-- 2d. Role baru ditambahkan (dengan scope site PPA-MLP)
delete from public.roles where nrp = '1780825' and role = 'gl_produksi';
insert into public.roles (nrp, role, active, scope_site)
select '1780825', 'gl_produksi', true, s.kode_site
  from public.sites s where s.nama_site = 'PPA-MLP';

delete from public.roles where nrp = '2240526' and role = 'pjo_site';
insert into public.roles (nrp, role, active, scope_site)
select '2240526', 'pjo_site', true, s.kode_site
  from public.sites s where s.nama_site = 'PPA-MLP';

-- 2e. Cabut izin yang HANYA berasal dari role lama
--     (izin dasar 'karyawan' dan izin yang juga ada di role baru tetap dipertahankan)
delete from public.user_permissions up
 where up.nrp = '1780825'
   and up.perm_key in (select perm_key from public.role_template_permissions where role_key = 'pjo_site')
   and up.perm_key not in (select perm_key from public.role_template_permissions where role_key = 'gl_produksi')
   and up.perm_key not in (select perm_key from public.role_template_permissions where role_key = 'karyawan');

delete from public.user_permissions up
 where up.nrp = '2240526'
   and up.perm_key in (select perm_key from public.role_template_permissions where role_key = 'gl_produksi')
   and up.perm_key not in (select perm_key from public.role_template_permissions where role_key = 'pjo_site')
   and up.perm_key not in (select perm_key from public.role_template_permissions where role_key = 'karyawan');

-- 2f. Salin izin role baru + pastikan izin dasar ada
insert into public.user_permissions (nrp, perm_key)
select '1780825', tp.perm_key
  from public.role_template_permissions tp
 where tp.role_key in ('gl_produksi', 'karyawan')
on conflict do nothing;

insert into public.user_permissions (nrp, perm_key)
select '2240526', tp.perm_key
  from public.role_template_permissions tp
 where tp.role_key in ('pjo_site', 'karyawan')
on conflict do nothing;

commit;


-- ============================================================
-- BAGIAN 3 — TUKAR RUJUKAN DI MATRIKS PERSETUJUAN
-- ============================================================
-- Jalankan HANYA kalau BAGIAN 1b menampilkan angka lebih dari 0.
-- Logikanya: karena posisinya bertukar, semua rujukan ke Tonara
-- dipindah ke Erik, dan sebaliknya.
-- Kalau BAGIAN 1b nol semua, lewati bagian ini.
-- ------------------------------------------------------------
-- begin;
--
-- create table if not exists public.approval_matrix_backup_tukar_20261025 as
--   select * from public.approval_matrix;
--
-- -- Tonara (1780825) -> Erik (2240526), dan Erik -> Tonara, sekaligus.
-- -- Dipakai penanda sementara supaya tidak saling menimpa.
-- update public.approval_matrix set atasan_nrp = 'TMP_SWAP'
--  where atasan_nrp in ('1780825', '2240526');
-- update public.approval_matrix set pjo_nrp = 'TMP_SWAP'
--  where pjo_nrp in ('1780825', '2240526');
--
-- update public.approval_matrix set atasan_nrp = '2240526'
--  where atasan_nrp = 'TMP_SWAP' and employee_nrp <> '1780825';
-- ...
--
-- commit;
--
-- ⚠️ Bagian ini sengaja dimatikan. Tukar-menukar rujukan atasan
-- tidak boleh dikarang: hanya Anda yang tahu siapa sebenarnya
-- atasan dan PJO masing-masing karyawan. Kirimkan hasil BAGIAN 1b
-- dan saya susun perintah yang tepat untuk angka yang muncul.


-- ============================================================
-- BAGIAN 4 — PEMERIKSAAN SETELAH PERBAIKAN
-- ============================================================
select e.nrp, e.nama, e.jabatan, e.departemen, e.site,
       coalesce(string_agg(r.role || coalesce(' [' || r.scope_site || ']', ''), ', '), '(TIDAK ADA)') as roles_aktif,
       (select count(*) from public.user_permissions up where up.nrp = e.nrp) as jumlah_izin
  from public.employees e
  left join public.roles r on r.nrp = e.nrp and r.active
 where e.nrp in ('1780825', '2240526')
 group by e.nrp, e.nama, e.jabatan, e.departemen, e.site
 order by e.nama;

-- Harapan:
--   Erik Widodo      | Deputy PJO   | Site Management | pjo_site [MLP]      | izin +-32
--   Tonara Heliantus | Production GL| Produksi        | gl_produksi [MLP]   | izin +-25
