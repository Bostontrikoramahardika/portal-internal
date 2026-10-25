-- ============================================================
-- SINKRON JABATAN -> DEPARTEMEN -> ROLE
-- 25 Oktober 2026 — Portal Internal BTM
-- ============================================================
-- Latar belakang:
--   Tulisan jabatan di Excel sering tidak konsisten. "Production GL"
--   artinya GL Produksi, tetapi orangnya bisa tercatat dengan role
--   'employee' (karyawan biasa). Akibatnya dia tidak bisa menyetujui
--   apa pun dan tidak muncul sebagai atasan.
--
-- Skrip ini memakai aturan yang SAMA dengan import (app/lib/jabatan-role.ts):
--   Production GL / GL Produksi / Prod GL  -> departemen Produksi, role gl_produksi
--   Plant GL / GL Plant                    -> departemen Plant,    role gl_plant
--   Mechanic / Mekanik / Welder / Las /
--   Helper / Electric                      -> departemen Plant,    role plant_team
--   Operator ...                           -> departemen Produksi, tanpa role struktural
--   PJO / Deputy PJO                       -> departemen Site Management, role pjo_site
--   HRGA / HR Site                         -> departemen HRGA, role hr_site
--   SHE Officer / SHE                      -> departemen SHE, role she_site
--   Site Admin / Admin Site                -> role admin_site
--   HR HO / SPV SHE HO / Staff Bus Dev     -> role hr_ho / spv_she_ho / business_dev
--
-- Sifat skrip:
--   * Jabatan yang tidak dikenali TIDAK diubah, TIDAK diberi role.
--   * Role lama tidak pernah dihapus. Skrip hanya menambah.
--   * Aman dijalankan berulang.
--
-- Urutan pemakaian: jalankan BAGIAN 1 (lihat), lalu BAGIAN 2 (perbaiki).
-- ============================================================


-- ============================================================
-- BAGIAN 1 — LIHAT DULU (tidak mengubah apa pun)
-- ============================================================
with peta as (
  select e.nrp, e.nama, e.site, e.jabatan, e.departemen, e.status_karyawan,
         j.jabatan_baku, j.departemen_baku, j.role_baku
    from public.employees e
    cross join lateral (
      select * from (values
        ('^PJO$|^PJO SITE$|^PROJECT (MANAGER|OFFICER)$',           'PJO',            'Site Management', 'pjo_site'),
        ('^DEPUTY PJO$|^WAKIL PJO$|^DPJO$',                        'Deputy PJO',     'Site Management', 'pjo_site'),
        ('^HRGA$|^HRGA SITE$|^HR SITE$|^HRD$',                     'HRGA',           'HRGA',            'hr_site'),
        ('^SHE( OFFICER)?$|^SAFETY( OFFICER)?$|^HSE$|^K3$',        'SHE Officer',    'SHE',             'she_site'),
        ('^PRODUCTION GL$|^GL PRODUKSI$|^PRODUKSI GL$|^PROD GL$|^GL PROD$|^GL PRODUCTION$',
                                                                   'Production GL',  'Produksi',        'gl_produksi'),
        ('^PLANT GL$|^GL PLANT$',                                  'Plant GL',       'Plant',           'gl_plant'),
        ('^MECHANIC.*$|^MEKANIK.*$',                               'Mechanic A2B',   'Plant',           'plant_team'),
        ('^WELDER$|^WELDING$|^LAS$|^TUKANG LAS$',                  'Welder',         'Plant',           'plant_team'),
        ('^HELPER( PLANT)?$|^PEMBANTU PLANT$',                     'Helper Plant',   'Plant',           'plant_team'),
        ('^ELECTRIC(IAN)?$|^ELEKTRIK$',                            'Electric',       'Plant',           'plant_team'),
        ('^OPERATOR EXCAVATOR$|^EXCAVATOR$',                       'Operator Excavator', 'Produksi',    null),
        ('^OPERATOR BULLDOZER$|^BULLDOZER$|^OPERATOR DOZER$|^DOZER$','Operator Bulldozer','Produksi',   null),
        ('^OPERATOR GRADER$|^GRADER$|^MOTOR GRADER$',              'Operator Grader','Produksi',        null),
        ('^OPERATOR$|^OPERATOR LAINNYA$|^OPERATOR .*$',             'Operator',       'Produksi',        null),
        ('^HR HO$|^HRGA HO$|^HR PUSAT$',                           'HR HO',          'HRGA',            'hr_ho'),
        ('^SPV SHE( HO)?$|^SUPERVISOR SHE( HO)?$',                 'SPV SHE HO',     'SHE',             'spv_she_ho'),
        ('^STAFF BUS DEV$|^BUS DEV$|^BUSINESS DEVELOPMENT$',       'Staff Bus Dev',  'Business Development','business_dev'),
        ('^SITE ADMIN$|^ADMIN SITE$|^ADMINISTRATOR SITE$',         'Site Admin',     null,              'admin_site'),
        ('^ADMIN GL$|^ADMIN PLANT$',                               'Admin GL',       null,              null),
        ('^PLANNER$|^PERENCANA$',                                  'Planner',        null,              null),
        ('^LOGISTIC CREW$|^LOGISTIK$|^LOGISTIC$',                  'Logistic Crew',  null,              null),
        ('^DRIVER( LV)?$|^PENGEMUDI$',                             'Driver LV',      null,              null)
      ) as v(pola, jabatan_baku, departemen_baku, role_baku)
      where upper(regexp_replace(trim(coalesce(e.jabatan,'')), '\s+', ' ', 'g')) ~ v.pola
      limit 1
    ) j
)
select p.nrp, p.nama, p.site, p.status_karyawan,
       p.jabatan as jabatan_sekarang, p.jabatan_baku,
       p.departemen as departemen_sekarang, p.departemen_baku,
       p.role_baku as role_yang_seharusnya,
       case when exists (select 1 from public.roles r
                          where r.nrp = p.nrp and r.role = p.role_baku and r.active)
            then 'sudah ada' else 'BELUM ADA' end as status_role
  from peta p
 where p.status_karyawan = 'Aktif'
   and ( p.jabatan <> p.jabatan_baku
      or (p.departemen_baku is not null and coalesce(p.departemen,'') <> p.departemen_baku)
      or (p.role_baku is not null and not exists (
            select 1 from public.roles r where r.nrp = p.nrp and r.role = p.role_baku and r.active)) )
 order by status_role desc, p.site, p.nama;
-- Yang perlu Anda perhatikan: baris dengan status_role = 'BELUM ADA'.


-- ============================================================
-- BAGIAN 2 — PERBAIKI
-- ============================================================
begin;

-- 2a. Cadangan
create table if not exists public.employees_backup_jabatan_20261025 as
  select * from public.employees;
create table if not exists public.roles_backup_jabatan_20261025 as
  select * from public.roles;

-- 2b. Peta aturan (dipakai ulang di bawah)
drop table if exists pg_temp.peta_jabatan;
create temp table peta_jabatan as
select e.nrp, e.nama, e.site, e.jabatan, e.departemen, e.status_karyawan,
       j.jabatan_baku, j.departemen_baku, j.role_baku
  from public.employees e
  cross join lateral (
    select * from (values
      ('^PJO$|^PJO SITE$|^PROJECT (MANAGER|OFFICER)$',           'PJO',            'Site Management', 'pjo_site'),
      ('^DEPUTY PJO$|^WAKIL PJO$|^DPJO$',                        'Deputy PJO',     'Site Management', 'pjo_site'),
      ('^HRGA$|^HRGA SITE$|^HR SITE$|^HRD$',                     'HRGA',           'HRGA',            'hr_site'),
      ('^SHE( OFFICER)?$|^SAFETY( OFFICER)?$|^HSE$|^K3$',        'SHE Officer',    'SHE',             'she_site'),
      ('^PRODUCTION GL$|^GL PRODUKSI$|^PRODUKSI GL$|^PROD GL$|^GL PROD$|^GL PRODUCTION$',
                                                                 'Production GL',  'Produksi',        'gl_produksi'),
      ('^PLANT GL$|^GL PLANT$',                                  'Plant GL',       'Plant',           'gl_plant'),
      ('^MECHANIC.*$|^MEKANIK.*$',                               'Mechanic A2B',   'Plant',           'plant_team'),
      ('^WELDER$|^WELDING$|^LAS$|^TUKANG LAS$',                  'Welder',         'Plant',           'plant_team'),
      ('^HELPER( PLANT)?$|^PEMBANTU PLANT$',                     'Helper Plant',   'Plant',           'plant_team'),
      ('^ELECTRIC(IAN)?$|^ELEKTRIK$',                            'Electric',       'Plant',           'plant_team'),
      ('^OPERATOR EXCAVATOR$|^EXCAVATOR$',                       'Operator Excavator', 'Produksi',    null),
      ('^OPERATOR BULLDOZER$|^BULLDOZER$|^OPERATOR DOZER$|^DOZER$','Operator Bulldozer','Produksi',   null),
      ('^OPERATOR GRADER$|^GRADER$|^MOTOR GRADER$',              'Operator Grader','Produksi',        null),
      ('^OPERATOR$|^OPERATOR LAINNYA$|^OPERATOR .*$',             'Operator',       'Produksi',        null),
      ('^HR HO$|^HRGA HO$|^HR PUSAT$',                           'HR HO',          'HRGA',            'hr_ho'),
      ('^SPV SHE( HO)?$|^SUPERVISOR SHE( HO)?$',                 'SPV SHE HO',     'SHE',             'spv_she_ho'),
      ('^STAFF BUS DEV$|^BUS DEV$|^BUSINESS DEVELOPMENT$',       'Staff Bus Dev',  'Business Development','business_dev'),
      ('^SITE ADMIN$|^ADMIN SITE$|^ADMINISTRATOR SITE$',         'Site Admin',     null,              'admin_site'),
      ('^ADMIN GL$|^ADMIN PLANT$',                               'Admin GL',       null,              null),
      ('^PLANNER$|^PERENCANA$',                                  'Planner',        null,              null),
      ('^LOGISTIC CREW$|^LOGISTIK$|^LOGISTIC$',                  'Logistic Crew',  null,              null),
      ('^DRIVER( LV)?$|^PENGEMUDI$',                             'Driver LV',      null,              null)
    ) as v(pola, jabatan_baku, departemen_baku, role_baku)
    where upper(regexp_replace(trim(coalesce(e.jabatan,'')), '\s+', ' ', 'g')) ~ v.pola
    limit 1
  ) j;

-- 2c. Rapikan tulisan jabatan + isi departemen baku (hanya yang aktif)
update public.employees e
   set jabatan    = p.jabatan_baku,
       departemen = coalesce(p.departemen_baku, e.departemen)
  from peta_jabatan p
 where p.nrp = e.nrp
   and p.status_karyawan = 'Aktif'
   and ( e.jabatan <> p.jabatan_baku
      or (p.departemen_baku is not null and coalesce(e.departemen,'') <> p.departemen_baku) );

-- 2d. Tambah role struktural yang belum ada (tidak menghapus role lama)
insert into public.roles (nrp, role, active, scope_site)
select p.nrp, p.role_baku, true,
       case when p.role_baku in ('pjo_site','hr_site','she_site','gl_plant','gl_produksi','plant_team','admin_site')
            then (select s.kode_site from public.sites s where s.nama_site = p.site)
            else null end
  from peta_jabatan p
 where p.status_karyawan = 'Aktif'
   and p.role_baku is not null
   and not exists (select 1 from public.roles r
                    where r.nrp = p.nrp and r.role = p.role_baku);

-- 2e. Salin izin role tersebut dari template
insert into public.user_permissions (nrp, perm_key)
select distinct p.nrp, tp.perm_key
  from peta_jabatan p
  join public.role_template_permissions tp on tp.role_key = p.role_baku
 where p.status_karyawan = 'Aktif'
   and p.role_baku is not null
on conflict do nothing;

-- 2f. Pastikan izin dasar karyawan juga ada
insert into public.user_permissions (nrp, perm_key)
select e.nrp, tp.perm_key
  from public.employees e
  cross join public.role_template_permissions tp
 where tp.role_key = 'karyawan'
   and e.status_karyawan = 'Aktif'
on conflict do nothing;

commit;

-- Setelah commit: jalankan BAGIAN 1 lagi.
-- Semua baris seharusnya 'sudah ada' dan tidak ada yang perlu diperbaiki.


-- ============================================================
-- BAGIAN 3 — PEMERIKSAAN KHUSUS (bisa dijalankan terpisah)
-- ============================================================
-- A. Cek dua orang yang Anda tanyakan
select e.nrp, e.nama, e.jabatan, e.departemen, e.site,
       coalesce(string_agg(distinct r.role, ', '), '(tanpa role)') as roles
  from public.employees e
  left join public.roles r on r.nrp = e.nrp and r.active
 where e.nrp in ('2440926', '2430926')
 group by e.nrp, e.nama, e.jabatan, e.departemen, e.site;

-- B. Siapa saja yang sekarang memegang gl_produksi / gl_plant
select r.role, e.nrp, e.nama, e.site, r.scope_site, r.active
  from public.roles r
  join public.employees e on e.nrp = r.nrp
 where r.role in ('gl_produksi', 'gl_plant')
 order by r.role, e.nama;

-- C. Karyawan yang jabatannya tidak dikenali aturan (perlu ditambah ke aturan)
select e.nrp, e.nama, e.jabatan, e.departemen, e.site
  from public.employees e
 where e.status_karyawan = 'Aktif'
   and coalesce(trim(e.jabatan),'') <> ''
   and not exists (
     select 1 from pg_temp.peta_jabatan p where p.nrp = e.nrp
   )
 order by e.jabatan;
