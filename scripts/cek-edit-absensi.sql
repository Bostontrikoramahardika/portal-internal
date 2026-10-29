-- ============================================================
-- CEK: kenapa edit absensi (mis. A → DS) tidak tersimpan
-- Jalankan di Supabase SQL Editor → Run. Hasilnya 3 bagian.
-- Ganti 'NRP_ALFAN' dan tanggal di bawah dengan data sebenarnya.
-- ============================================================

-- ① Apakah sudah ada baris absensi untuk orang itu di tanggal itu?
--    Kalau 0 baris → aplikasi harus INSERT, dan di situ sering gagal.
select nrp, tanggal, shift, status, clock_in, clock_out, keterangan
from public.attendance
where nrp = 'NRP_ALFAN'
  and tanggal = '2026-10-29';

-- ② Kolom apa yang WAJIB (NOT NULL) dan mana yang punya nilai otomatis?
--    Kolom NOT NULL tanpa default = penyebab insert gagal diam-diam.
select column_name, data_type, is_nullable, coalesce(column_default, '-') as default
from information_schema.columns
where table_schema = 'public' and table_name = 'attendance'
order by ordinal_position;

-- ③ Apakah ada batasan unik / index yang menghalangi (nrp + tanggal + shift)?
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'attendance';

-- ④ Uji tulis langsung (baris ke-2 yang mengubah data Alfan)
--    Jalankan SETELAH membaca hasil ①–③.
-- update public.attendance
-- set status = 'DS',
--     keterangan = '[MANUAL:DS] dikoreksi HR',
--     shift = 'SIANG',
--     updated_at = now()
-- where nrp = 'NRP_ALFAN' and tanggal = '2026-10-29';
--
-- lalu baca ulang:
-- select nrp, tanggal, status, keterangan, shift
-- from public.attendance
-- where nrp = 'NRP_ALFAN' and tanggal = '2026-10-29';
