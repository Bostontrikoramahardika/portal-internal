-- ═════════════════════════════════════════════════════════════
-- GANTI KODE FORM: AMM-IPT  →  PPA-MLP
-- Form Inspeksi & Observasi tadinya memakai kode site AMM-IPT.
-- Script ini menyamakan kode di database dengan site yang dipakai
-- sekarang (PPA-MLP). Aman dijalankan berulang.
-- ═════════════════════════════════════════════════════════════

-- 1. Katalog form
update she_forms
set kode = replace(kode, 'AMM-IPT', 'PPA-MLP')
where kode like 'AMM-IPT%';

-- 2. Kode form yang tersimpan di laporan yang sudah masuk
update she_submissions
set kode_form = replace(kode_form, 'AMM-IPT', 'PPA-MLP')
where kode_form like 'AMM-IPT%';

-- 3. Cek hasil — harusnya tidak ada lagi yang berawalan AMM-IPT
select jenis, count(*) as jumlah, min(kode) as contoh_kode
from she_forms
group by jenis;

select count(*) as sisa_amm_ipt
from she_forms
where kode like 'AMM-IPT%';
