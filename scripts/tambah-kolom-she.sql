-- Tambahan kolom untuk modul Inspeksi & Observasi
-- Jalankan sekali di Supabase SQL Editor (aman diulang).

alter table public.she_submissions add column if not exists site text;
alter table public.she_submissions add column if not exists departemen text;
alter table public.she_submissions add column if not exists verifikasi_catatan text;
alter table public.she_items       add column if not exists foto_url text;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('she_submissions','she_items')
order by table_name, ordinal_position;
