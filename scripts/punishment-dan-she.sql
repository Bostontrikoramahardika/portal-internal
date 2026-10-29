-- ============================================================
-- MODUL BARU: PUNISHMENT + INSPEKSI + OBSERVASI
-- Jalankan seluruh isi file ini di Supabase SQL Editor.
-- Aman dijalankan berulang (pakai IF NOT EXISTS / ON CONFLICT).
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. PENGATURAN POIN POTONG KPI
--    CNC -2 · Surat Komitmen -3 · SP1 -5 · SP2 -10 · SP3 -15
--    Angka boleh diubah kapan saja dengan UPDATE.
-- ─────────────────────────────────────────────
create table if not exists public.punishment_poin (
  jenis       text primary key,          -- CNC | SK | SP1 | SP2 | SP3
  label       text not null,
  poin        numeric not null default 0,
  urutan      int not null default 0,
  aktif       boolean not null default true
);

insert into public.punishment_poin (jenis, label, poin, urutan) values
  ('CNC', 'Coaching & Counselling', 2,  1),
  ('SK',  'Surat Komitmen',         3,  2),
  ('SP1', 'Surat Peringatan 1',     5,  3),
  ('SP2', 'Surat Peringatan 2',     10, 4),
  ('SP3', 'Surat Peringatan 3',     15, 5)
on conflict (jenis) do nothing;


-- ─────────────────────────────────────────────
-- 2. TABEL PUNISHMENT (CNC / SP1 / SP2 / SP3 / Surat Komitmen)
--    Alur: leader buat (MENUNGGU_PJO) → PJO setujui (TERBIT)
--          → HR arsip. KPI terpotong saat status TERBIT.
-- ─────────────────────────────────────────────
create table if not exists public.punishments (
  id                 uuid primary key default gen_random_uuid(),
  nomor_surat        text,
  jenis              text not null,
  nrp                text not null,
  nama               text,
  jabatan            text,
  departemen         text,
  site               text,

  -- isi surat
  pelanggaran        text,
  uraian             text,
  dasar_aturan       text,
  tanggal_kejadian   date,
  tanggal_terbit     date default current_date,
  masa_berlaku_hari  int default 180,
  tanggal_berakhir   date,
  sanksi_ke          int,

  -- khusus CNC (sesuai blanko Coaching & Counselling)
  hari               text,
  waktu_pertemuan    text,
  tempat             text,
  materi_pribadi     boolean default false,
  materi_keluarga    boolean default false,
  materi_pekerjaan   boolean default false,
  solusi             text,
  komitmen           text,

  -- pembuat & penyetuju
  dibuat_oleh        text,
  dibuat_oleh_nama   text,
  dibuat_oleh_jabatan text,
  status             text not null default 'MENUNGGU_PJO',
  pjo_nrp            text,
  pjo_nama           text,
  pjo_catatan        text,
  pjo_at             timestamptz,
  hr_nrp             text,
  hr_nama            text,
  hr_catatan         text,
  hr_arsip           boolean not null default false,
  hr_at              timestamptz,

  poin               numeric not null default 0,
  lampiran_url       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_punishments_nrp    on public.punishments (nrp);
create index if not exists idx_punishments_status on public.punishments (status);
create index if not exists idx_punishments_bulan  on public.punishments (tanggal_terbit);


-- ─────────────────────────────────────────────
-- 3. KATALOG FORM SHE (55 inspeksi + 44 observasi)
-- ─────────────────────────────────────────────
create table if not exists public.she_forms (
  id            uuid primary key default gen_random_uuid(),
  jenis         text not null,             -- INSPEKSI | OBSERVASI
  kode          text not null,
  nama          text not null,
  mode          text not null default 'item', -- item | person | orang
  kolom         jsonb not null default '[]'::jsonb,
  items         jsonb not null default '[]'::jsonb,
  jumlah_baris  int not null default 0,
  aktif         boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (jenis, kode)
);

create index if not exists idx_she_forms_jenis on public.she_forms (jenis);


-- ─────────────────────────────────────────────
-- 4. ISI / PENGIRIMAN FORM SHE
-- ─────────────────────────────────────────────
create table if not exists public.she_submissions (
  id                uuid primary key default gen_random_uuid(),
  form_id           uuid references public.she_forms(id) on delete set null,
  jenis             text not null,
  kode_form         text,
  nama_form         text,
  tanggal           date not null default current_date,
  jam               text,
  site              text,
  lokasi            text,
  unit              text,
  pengawas_nrp      text,
  pengawas_nama     text,
  diperiksa_nrp     text,
  diperiksa_nama    text,
  departemen        text,
  status            text not null default 'TERKIRIM',  -- TERKIRIM | DIVERIFIKASI
  jumlah_temuan     int not null default 0,
  catatan           text,
  verified_by       text,
  verified_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_she_sub_jenis  on public.she_submissions (jenis);
create index if not exists idx_she_sub_tanggal on public.she_submissions (tanggal);

create table if not exists public.she_items (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.she_submissions(id) on delete cascade,
  no             int,
  uraian         text,
  hasil          text,          -- R / Q / N/A  atau YES / NO / N/A
  keterangan     text,
  hazard         text,          -- H / S / M
  foto_url       text
);

create index if not exists idx_she_items_sub on public.she_items (submission_id);


-- ─────────────────────────────────────────────
-- 5. MENU: Inpeksi, Observasi, Punishment
--    Untuk role: leader (GL), SHE, HR, PJO
-- ─────────────────────────────────────────────
insert into public.menus
  (role, menu_key, menu_label, menu_icon, menu_group, sort_order, active, parent_menu_key, href)
select r.role, m.menu_key, m.menu_label, m.menu_icon, m.menu_group, m.sort_order, true, null, m.href
from (values
    ('inspeksi',   'Inspeksi',   '🦺', 'SHE', 300, '/dashboard?menu=inspeksi'),
    ('observasi',  'Observasi',  '👁️', 'SHE', 301, '/dashboard?menu=observasi'),
    ('punishment', 'Punishment', '⚠️', 'HR',  302, '/dashboard?menu=punishment')
  ) as m(menu_key, menu_label, menu_icon, menu_group, sort_order, href)
cross join (values
    ('gl_produksi'), ('gl_plant'), ('atasan'),
    ('she_site'), ('spv_she_ho'),
    ('hr_site'), ('hrga_site'), ('hr_ho'), ('hrga'), ('hrga_pusat'),
    ('pjo_site'), ('pjo'),
    ('admin'), ('super_admin')
  ) as r(role)
where not exists (
  select 1 from public.menus x
   where x.menu_key = m.menu_key and x.role = r.role
);


-- ─────────────────────────────────────────────
-- 6. CEK HASIL
-- ─────────────────────────────────────────────
select menu_key, menu_label, menu_group, role, sort_order
from public.menus
where menu_key in ('inspeksi', 'observasi', 'punishment')
order by sort_order, role;


-- ============================================================
-- BATALKAN (kalau mau menghapus menu lagi)
-- ============================================================
-- delete from public.menus where menu_key in ('inspeksi','observasi','punishment');

-- ============================================================
-- CATATAN
-- ============================================================
-- • Daftar 99 form SHE (55 inspeksi + 44 observasi) TIDAK perlu
--   di-insert manual. Aplikasi membacanya dari
--   app/lib/data/she-templates.json lalu mengisi tabel she_forms
--   otomatis saat halaman Inspeksi/Observasi pertama kali dibuka.
-- • Poin potong KPI bisa diubah:
--     update public.punishment_poin set poin = 7 where jenis = 'SP1';
-- • KPI terpotong hanya untuk punishment berstatus 'TERBIT'.


-- ─────────────────────────────────────────────
-- 7. TEMPAT SIMPAN FOTO TEMUAN (storage bucket)
--    Dipakai untuk upload foto di Inspeksi & Observasi.
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('she-files', 'she-files', true)
on conflict (id) do nothing;

-- Kalau perintah di atas ditolak (perlu izin storage), buat manual:
--   Supabase > Storage > New bucket > nama: she-files > Public: ON

-- Cek bucket sudah ada:
select id, name, public from storage.buckets where id = 'she-files';
