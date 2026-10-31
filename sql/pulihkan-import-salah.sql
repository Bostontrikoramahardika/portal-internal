-- ═══════════════════════════════════════════════════════════════
-- PEMULIHAN SETELAH IMPORT KOREKSI YANG SALAH
-- (muncul ribuan sel baru: (kosong)→A, (kosong)→CR, dan CR berubah jadi CT)
--
-- CARA PAKAI: Supabase → SQL Editor → New query → copy paste → RUN
-- Jalankan LANGKAH 1 → 2 → 3, jangan dibalik.
-- Ganti '2026-10' kalau bulannya lain.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- LANGKAH 1 — LIHAT DULU (tidak mengubah apa pun)
-- ───────────────────────────────────────────────
-- 1a. berapa baris yang disentuh import
select
  case when clock_in is null then 'DIBUAT BARU (palsu)' else 'DIUBAH' end as jenis,
  count(*) as jumlah
from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31'
group by 1;

-- 1b. contoh baris yang akan dihapus
select nrp, tanggal, status, shift, keterangan
from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and clock_in is null
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31'
order by tanggal, nrp
limit 20;


-- ───────────────────────────────────────────────
-- LANGKAH 2 — HAPUS BARIS PALSU HASIL IMPORT
--   (hanya baris yang DIBUAT import: tidak punya jam masuk,
--    dan keterangannya ditandai buatan import)
--   Baris absensi asli (ada jam masuk) TIDAK disentuh.
-- ───────────────────────────────────────────────
delete from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and clock_in is null
  and clock_out is null
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31';


-- ───────────────────────────────────────────────
-- LANGKAH 3 — KEMBALIKAN BARIS YANG TERLANJUR DIUBAH (opsional)
--
--   Baris ini absensi ASLI (punya jam masuk) tapi status/shift-nya
--   ditimpa import, dan keterangan aslinya ikut tertimpa.
--   Status asli tidak tersimpan di mana pun, jadi dikembalikan
--   memakai patokan jam masuk + menit keterlambatan.
--
--   Kalau Anda TIDAK yakin, lewati langkah ini dan perbaiki manual
--   lewat menu Manajemen Absensi (klik sel → Ubah absensi).
-- ───────────────────────────────────────────────
-- lihat dulu:
select nrp, tanggal, status, shift, clock_in, jam_kerja_menit, terlambat_menit
from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and clock_in is not null
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31'
order by tanggal, nrp
limit 50;

-- kalau sudah yakin, hapus tanda import saja (status dibiarkan):
-- update public.attendance
--   set keterangan = null
--   where keterangan like '[IMPORT-EXCEL]%'
--     and clock_in is not null
--     and tanggal >= '2026-10-01' and tanggal <= '2026-10-31';


-- ───────────────────────────────────────────────
-- LANGKAH 4 — KALAU ADA LEBIH DARI SATU IMPORT
--   Hapus hanya import tertentu (misal yang dari file bernama X):
-- ───────────────────────────────────────────────
-- delete from public.attendance
--   where keterangan like '[IMPORT-EXCEL] koreksi dari file NAMA_FILE.xlsx%'
--     and clock_in is null
--     and tanggal >= '2026-10-01' and tanggal <= '2026-10-31';


-- ───────────────────────────────────────────────
-- LANGKAH 5 — CEK HASIL
-- ───────────────────────────────────────────────
select tanggal, count(*) as sisa_tanda_import
from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31'
group by tanggal
order by tanggal;
-- harus kosong / sedikit sekali
