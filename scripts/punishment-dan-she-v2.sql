-- ============================================================
-- MODUL PUNISHMENT + INSPEKSI + OBSERVASI  —  VERSI 2 (aman)
-- Pakai file INI kalau versi sebelumnya gagal.
--
-- PENTING: jangan jalankan seluruh file sekaligus.
-- Jalankan BAGIAN 1 dulu → Run. Lalu BAGIAN 2 → Run. Lalu BAGIAN 3 → Run.
-- Kalau satu bagian error, bagian lain tetap tersimpan.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- BAGIAN 1 — TABEL (jalankan ini dulu, sendiri)
-- ════════════════════════════════════════════════════════════

-- 1a. Poin potong KPI
create table if not exists public.punishment_poin (
  jenis       text primary key,
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


-- 1b. Tabel punishment
create table if not exists public.punishments (
  id                 uuid primary key default gen_random_uuid(),
  nomor_surat        text,
  jenis              text not null,
  nrp                text not null,
  nama               text,
  jabatan            text,
  departemen         text,
  site               text,
  pelanggaran        text,
  uraian             text,
  dasar_aturan       text,
  tanggal_kejadian   date,
  tanggal_terbit     date default current_date,
  masa_berlaku_hari  int default 180,
  tanggal_berakhir   date,
  sanksi_ke          int,
  hari               text,
  waktu_pertemuan    text,
  tempat             text,
  materi_pribadi     boolean default false,
  materi_keluarga    boolean default false,
  materi_pekerjaan   boolean default false,
  solusi             text,
  komitmen           text,
  poin               numeric default 0,
  status             text default 'MENUNGGU_PJO',
  dibuat_oleh_nrp    text,
  dibuat_oleh_nama   text,
  dibuat_oleh_jabatan text,
  pjo_nrp            text,
  pjo_nama           text,
  pjo_catatan        text,
  pjo_at             timestamptz,
  hr_arsip           boolean default false,
  hr_nama            text,
  hr_at              timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists idx_punishments_nrp    on public.punishments (nrp);
create index if not exists idx_punishments_status on public.punishments (status);
create index if not exists idx_punishments_bulan  on public.punishments (tanggal_terbit);


-- 1c. Katalog form SHE
create table if not exists public.she_forms (
  id            uuid primary key default gen_random_uuid(),
  jenis         text not null,           -- INSPEKSI | OBSERVASI
  kode          text not null,
  nama          text not null,
  mode          text default 'item',     -- item | person
  kolom         jsonb default '[]'::jsonb,
  items         jsonb default '[]'::jsonb,
  jumlah_baris  int default 0,
  aktif         boolean default true,
  created_at    timestamptz default now(),
  unique (jenis, kode)
);

create index if not exists idx_she_forms_jenis on public.she_forms (jenis);


-- 1d. Laporan (header)
create table if not exists public.she_submissions (
  id              uuid primary key default gen_random_uuid(),
  form_id         uuid,
  jenis           text not null,
  kode_form       text,
  nama_form       text,
  tanggal         date default current_date,
  jam             text,
  lokasi          text,
  unit            text,
  pengawas_nrp    text,
  pengawas_nama   text,
  diperiksa_nrp   text,
  diperiksa_nama  text,
  jumlah_temuan   int default 0,
  catatan         text,
  status          text default 'TERKIRIM',   -- TERKIRIM | DIVERIFIKASI
  verifikator_nrp text,
  verifikator_nama text,
  verifikasi_at   timestamptz,
  verifikasi_catatan text,
  created_at      timestamptz default now()
);

create index if not exists idx_she_sub_jenis   on public.she_submissions (jenis);
create index if not exists idx_she_sub_tanggal on public.she_submissions (tanggal);


-- 1e. Butir laporan (+ foto)
create table if not exists public.she_items (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid references public.she_submissions(id) on delete cascade,
  no            int,
  uraian        text,
  hasil         text,
  hazard        text,          -- H | S | M
  keterangan    text,
  foto_url      text,
  created_at    timestamptz default now()
);

create index if not exists idx_she_items_sub on public.she_items (submission_id);

-- Tabel lama yang belum punya kolom foto → tambahkan
alter table public.she_items    add column if not exists foto_url text;
alter table public.she_submissions add column if not exists verifikasi_catatan text;

-- CEK BAGIAN 1 (harus keluar 6 baris)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('punishment_poin','punishments','she_forms','she_submissions','she_items','menus')
order by table_name;



-- ════════════════════════════════════════════════════════════
-- BAGIAN 2 — MENU (jalankan setelah BAGIAN 1 berhasil)
--   Versi aman: hanya mengisi kolom yang MEMANG ADA di tabel menus,
--   dan kalau satu role gagal, role lain tetap masuk.
-- ════════════════════════════════════════════════════════════
do $$
declare
  r record;
  c text;
  col_list text;
  val_list text;
  v_sql text;
  m record;
begin
  for m in
    select * from (values
      ('inspeksi',   'Inspeksi',   '🦺', 'SHE', 300, '/dashboard?menu=inspeksi'),
      ('observasi',  'Observasi',  '👁️', 'SHE', 301, '/dashboard?menu=observasi'),
      ('punishment', 'Punishment', '⚠️', 'HR',  302, '/dashboard?menu=punishment')
    ) as v(menu_key, menu_label, menu_icon, menu_group, sort_order, href)
  loop
    for r in
      select * from (values
        ('gl_produksi'), ('gl_plant'), ('atasan'),
        ('she_site'), ('spv_she_ho'),
        ('hr_site'), ('hrga_site'), ('hr_ho'), ('hrga'), ('hrga_pusat'),
        ('pjo_site'), ('pjo'),
        ('admin'), ('super_admin')
      ) as v(role)
    loop
      col_list := '';
      val_list := '';

      for c in
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'menus'
      loop
        col_list := col_list || quote_ident(c) || ',';
        if c = 'role' then
          val_list := val_list || quote_literal(r.role) || ',';
        elsif c = 'menu_key' then
          val_list := val_list || quote_literal(m.menu_key) || ',';
        elsif c in ('menu_label','label','nama') then
          val_list := val_list || quote_literal(m.menu_label) || ',';
        elsif c in ('menu_icon','icon','ikon') then
          val_list := val_list || quote_literal(m.menu_icon) || ',';
        elsif c in ('menu_group','grup','group_name') then
          val_list := val_list || quote_literal(m.menu_group) || ',';
        elsif c in ('href','path','url') then
          val_list := val_list || quote_literal(m.href) || ',';
        elsif c in ('sort_order','urutan','order_no') then
          val_list := val_list || m.sort_order || ',';
        elsif c in ('active','aktif','is_active') then
          val_list := val_list || 'true,';
        elsif c in ('parent_menu_key','parent','parent_key') then
          val_list := val_list || 'null,';
        elsif c = 'nav_tab' then
          val_list := val_list || 'null,';
        else
          col_list := rtrim(col_list, ',');
        end if;
      end loop;

      col_list := rtrim(col_list, ',');
      val_list := rtrim(val_list, ',');

      if col_list = '' then
        raise exception 'Tidak ada kolom yang cocok di tabel menus';
      end if;

      begin
        if not exists (
          select 1 from public.menus
          where menu_key = m.menu_key and role = r.role
        ) then
          v_sql := 'insert into public.menus (' || col_list || ') values (' || val_list || ')';
          execute v_sql;
        end if;
      exception
        when others then
          raise notice 'GAGAL % / % → %', m.menu_key, r.role, sqlerrm;
      end;
    end loop;
  end loop;
end $$;

-- CEK BAGIAN 2 (harus ada 3 menu_key)
select menu_key, count(*) as jumlah_role
from public.menus
where menu_key in ('inspeksi','observasi','punishment')
group by menu_key;



-- ════════════════════════════════════════════════════════════
-- BAGIAN 3 — BUCKET FOTO (jalankan setelah BAGIAN 1 berhasil)
-- ════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('she-files', 'she-files', true)
on conflict (id) do nothing;

select id, name, public from storage.buckets where id = 'she-files';
