-- ═══════════════════════════════════════════════════════════════
-- PEMULIHAN SETELAH IMPORT KOREKSI YANG SALAH
--
-- Konteks: import lama menulis ribuan baris palsu (status CUTI/ALPHA/LIBUR)
--          ke tabel attendance, sehingga tampilan berubah (mis. CR -> CT).
--
-- CARA PAKAI
--   1. Supabase → SQL Editor → New query
--   2. Copy seluruh isi file ini, paste, klik RUN
--   3. Baca hasil tiap langkah sebelum lanjut ke langkah berikutnya
--   4. Ganti '2026-10' di semua tempat kalau bulannya berbeda
--
-- Semua langkah hanya menyentuh baris yang bertanda keterangan
-- '[IMPORT-EXCEL]' pada periode yang disebut. Absensi lain tidak disentuh.
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────
-- LANGKAH 1 — LIHAT (tidak mengubah apa pun)
-- ───────────────────────────────────────────────
select
  case
    when clock_in is null then 'A. DIBUAT BARU oleh import (palsu)'
    else 'B. Baris ASLI yang statusnya ditimpa'
  end as jenis,
  count(*) as jumlah,
  min(tanggal) as dari_tanggal,
  max(tanggal) as sampai_tanggal
from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31'
group by 1
order by 1;


-- ───────────────────────────────────────────────
-- LANGKAH 2 — HAPUS BARIS PALSU (jenis A)
--   Ciri: dibuat import, tidak punya jam masuk sama sekali.
--   Absensi asli selalu punya clock_in (atau clock_out) jadi aman.
-- ───────────────────────────────────────────────
delete from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and clock_in is null
  and clock_out is null
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31';

-- hasil yang diharapkan: "DELETE 2331" (atau sesuai LANGKAH 1 jenis A)


-- ───────────────────────────────────────────────
-- LANGKAH 3 — KEMBALIKAN BARIS ASLI (jenis B) SECARA OTOMATIS
--
--   Baris ini punya jam masuk (bukti nyata orang itu bekerja), tetapi
--   status/shift-nya ditimpa import. Patokan pemulihan:
--     - jam masuk < 12:00  → shift SIANG
--     - jam masuk >= 12:00 → shift MALAM
--     - terlambat_menit > 0 → TERLAMBAT, selain itu HADIR
--   Tanda keterangan import dihapus.
--
--   LIHAT DULU hasil pemetaannya (tidak mengubah apa pun):
-- ───────────────────────────────────────────────
select
  nrp,
  tanggal,
  status  as status_sekarang,
  shift   as shift_sekarang,
  to_char(clock_in::timestamptz, 'HH24:MI') as jam_masuk,
  terlambat_menit,
  case when terlambat_menit > 0 then 'TERLAMBAT' else 'HADIR' end as status_pulih,
  case when extract(hour from clock_in::timestamptz) < 12 then 'SIANG' else 'MALAM' end as shift_pulih
from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and clock_in is not null
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31'
order by tanggal, nrp
limit 50;

-- Kalau tabel di atas terlihat masuk akal, jalankan pemulihannya:
update public.attendance
set
  status     = case when terlambat_menit > 0 then 'TERLAMBAT' else 'HADIR' end,
  shift      = case when extract(hour from clock_in::timestamptz) < 12 then 'SIANG' else 'MALAM' end,
  keterangan = null,
  updated_at = now()
where keterangan like '[IMPORT-EXCEL]%'
  and clock_in is not null
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31';

-- hasil yang diharapkan: "UPDATE 131" (atau sesuai LANGKAH 1 jenis B)

-- CATATAN: kalau ada baris jenis B yang sebenarnya SAKIT / IZIN / CUTI
-- (bukan sekadar hadir), perbaiki manual lewat aplikasi:
-- Manajemen Absensi → klik sel tanggal itu → "Ubah absensi".


-- ───────────────────────────────────────────────
-- LANGKAH 4 — CEK HASIL
-- ───────────────────────────────────────────────
select count(*) as sisa_tanda_import
from public.attendance
where keterangan like '[IMPORT-EXCEL]%'
  and tanggal >= '2026-10-01' and tanggal <= '2026-10-31';
-- harus 0


-- ───────────────────────────────────────────────
-- LANGKAH 5 — BANDINGKAN DENGAN ROSTER
--   Setelah bersih, sel yang dulu CT/CR seharusnya kembali sesuai roster.
--   Contoh cek 10 karyawan pertama:
-- ───────────────────────────────────────────────
select r.nrp, r.tanggal, r.shift_code as roster, a.status, a.shift
from public.rosters r
left join public.attendance a
  on a.nrp = r.nrp and a.tanggal = r.tanggal
where r.tanggal >= '2026-10-01' and r.tanggal <= '2026-10-10'
order by r.nrp, r.tanggal
limit 40;

-- Sesudah ini: buka aplikasi → Manajemen Absensi → Refresh.
-- Baru setelah tampilan normal, silakan ulangi import koreksi.
-- Angka "sel berubah" seharusnya kecil (puluhan), bukan ratusan/ribuan.
