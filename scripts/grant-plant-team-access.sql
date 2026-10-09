-- ═══════════════════════════════════════════════════════════════════════
--  GRANT AKSES TEAM PLANT (role: plant_team) — Site PPA-MLP
--  Aplikasi : Portal Internal BTM (portal-internal)
--  Sifat    : ADDITIVE & IDEMPOTENT — tidak menghapus role/menu lain,
--             dan aman dijalankan berulang kali.
--  Syarat   : file ini dijalankan MANUAL di Supabase → SQL Editor
--             (tidak dipanggil otomatis oleh aplikasi).
--
--  YANG DILAKUKAN
--   1. Mencari pegawai aktif Helper Plant / Mechanic A2B / Welder site PPA-MLP
--      + 2 NRP khusus (employees.site NULL): 2400926 & 2410926.
--   2. Memvalidasi jumlah: TOTAL 22 akun (12 Helper [2 di antaranya site NULL],
--      5 Mechanic A2B, 5 Welder). Kalau tidak pas → BATAL, tidak ada perubahan.
--   3. Memberi role `plant_team` dengan scope_site PPA-MLP (tidak menyentuh
--      kolom employees.site).
--   4. Menyalin menu Plant/APD yang sudah dipakai role acuan ke role plant_team.
--
--  YANG TIDAK MENYETUJUI APA PUN: script ini TIDAK memberi hak approval.
--  Team Plant hanya bisa melihat (read-only) dan mengajukan PR.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- 0. KONFIGURASI — ubah di sini kalau nama jabatan/site berbeda
-- ───────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE cfg_plant_team ON COMMIT DROP AS
SELECT
  'PPA-MLP'::text                                   AS scope_site,
  ARRAY['2400926','2410926']::text[]                AS nrp_tambahan,
  ARRAY['helper']::text[]                           AS kata_jabatan_helper,
  ARRAY['mechanic','mekanik']::text[]               AS kata_jabatan_mechanic,
  ARRAY['welder']::text[]                           AS kata_jabatan_welder,
  ARRAY['gl_plant','admin_plant']::text[]           AS role_acuan_menu,
  -- Menu yang diberikan ke Team Plant.
  -- CATATAN: 'plant_dashboard' (halaman /dashboard/plant) sengaja TIDAK
  -- dimasukkan karena halaman itu juga punya aksi tambah/ubah unit & upload
  -- format inspeksi. Tambahkan sendiri ke array ini kalau memang diinginkan.
  ARRAY['plant_inspeksi','plant_logistik',
        'plant_katalog','plant_orders','logistik']::text[] AS menu_diizinkan,
  12::int                                           AS target_helper,
   2::int                                           AS target_helper_site_null,
   5::int                                           AS target_mechanic,
   5::int                                           AS target_welder;

-- ───────────────────────────────────────────────────────────────────────
-- 1. TENTUKAN NAMA SITE PPA-MLP (kode_site / nama_site dari sites_config)
-- ───────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE sitelist_plant_team ON COMMIT DROP AS
SELECT kode_site::text AS nilai FROM sites_config
 WHERE kode_site IS NOT NULL
   AND (kode_site ILIKE '%PPA-MLP%' OR nama_site ILIKE '%PPA-MLP%')
UNION
SELECT nama_site::text FROM sites_config
 WHERE nama_site IS NOT NULL
   AND (kode_site ILIKE '%PPA-MLP%' OR nama_site ILIKE '%PPA-MLP%');

-- ───────────────────────────────────────────────────────────────────────
-- 2. DAFTAR KANDIDAT (hanya dibaca, tidak diubah)
-- ───────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE kandidat_plant_team ON COMMIT DROP AS
SELECT
  e.nrp::text                                   AS nrp,
  e.nama::text                                  AS nama,
  e.jabatan::text                               AS jabatan,
  e.site::text                                  AS site,
  CASE
    WHEN EXISTS (SELECT 1 FROM cfg_plant_team c WHERE lower(e.jabatan) LIKE '%' || c.kata_jabatan_helper[1] || '%')   THEN 'HELPER'
    WHEN EXISTS (SELECT 1 FROM cfg_plant_team c WHERE lower(e.jabatan) LIKE '%' || c.kata_jabatan_mechanic[1] || '%'
                                                     OR lower(e.jabatan) LIKE '%' || c.kata_jabatan_mechanic[2] || '%') THEN 'MECHANIC'
    WHEN EXISTS (SELECT 1 FROM cfg_plant_team c WHERE lower(e.jabatan) LIKE '%' || c.kata_jabatan_welder[1] || '%')   THEN 'WELDER'
  END                                           AS kategori,
  (e.nrp::text IN (SELECT unnest(nrp_tambahan) FROM cfg_plant_team))          AS nrp_khusus,
  (e.site IS NULL)                                                            AS site_null
FROM employees e
CROSS JOIN cfg_plant_team c
WHERE
  -- pegawai aktif
  COALESCE(lower(e.status_karyawan), 'aktif') = 'aktif'
  AND e.tanggal_resign IS NULL
  -- site PPA-MLP ATAU termasuk 2 NRP khusus (site NULL)
  AND (
    e.site IN (SELECT nilai FROM sitelist_plant_team)
    OR e.nrp::text IN (SELECT unnest(nrp_tambahan) FROM cfg_plant_team)
  )
  -- jabatan yang disepakati
  AND (
    lower(e.jabatan) LIKE '%helper%'
    OR lower(e.jabatan) LIKE '%mechanic%'
    OR lower(e.jabatan) LIKE '%mekanik%'
    OR lower(e.jabatan) LIKE '%welder%'
  );

-- ───────────────────────────────────────────────────────────────────────
-- 3. VALIDASI — berhenti kalau jumlah tidak sesuai kesepakatan
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  n_helper        int; n_mech int; n_welder int; n_total int;
  n_helper_null   int; n_null_lain int;
  r RECORD;
BEGIN
  SELECT COUNT(*) FILTER (WHERE kategori = 'HELPER'),
         COUNT(*) FILTER (WHERE kategori = 'MECHANIC'),
         COUNT(*) FILTER (WHERE kategori = 'WELDER'),
         COUNT(*)
    INTO n_helper, n_mech, n_welder, n_total
    FROM kandidat_plant_team;

  SELECT COUNT(*) FILTER (WHERE kategori = 'HELPER' AND site_null),
         COUNT(*) FILTER (WHERE site_null AND kategori <> 'HELPER')
    INTO n_helper_null, n_null_lain
    FROM kandidat_plant_team;

  IF n_helper <> 12 OR n_helper_null <> 2 OR n_mech <> 5 OR n_welder <> 5 OR n_total <> 22 THEN
    RAISE NOTICE '=== DAFTAR KANDIDAT YANG DITEMUKAN ===';
    FOR r IN SELECT nrp, nama, jabatan, COALESCE(site,'(NULL)') AS site, kategori FROM kandidat_plant_team ORDER BY kategori, nama LOOP
      RAISE NOTICE '% | % | % | site=%', r.nrp, r.nama, r.jabatan, r.site;
    END LOOP;

    RAISE EXCEPTION
      E'Validasi GAGAL — jumlah tidak sesuai target 22 akun.\n'
      'Helper Plant     : % (target 12)\n'
      '  - site NULL    : % (target 2)\n'
      'Mechanic A2B     : % (target 5)\n'
      'Welder           : % (target 5)\n'
      'TOTAL            : % (target 22)\n'
      'Site NULL selain Helper: %\n'
      'Tidak ada perubahan yang diterapkan. Periksa nama jabatan / site / status karyawan, '
      'lalu sesuaikan bagian KONFIGURASI (bagian 0) dan jalankan ulang.',
      n_helper, n_helper_null, n_mech, n_welder, n_total, n_null_lain;
  END IF;

  RAISE NOTICE 'Validasi OK: 12 Helper Plant (2 site NULL) + 5 Mechanic A2B + 5 Welder = 22 akun.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- 4. ROLE plant_team + scope_site (additive, tidak menghapus role lain)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO roles (nrp, role, scope_site, active)
SELECT k.nrp, 'plant_team', c.scope_site, true
FROM kandidat_plant_team k
CROSS JOIN cfg_plant_team c
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE r.nrp = k.nrp AND r.role = 'plant_team'
);

-- Kalau baris role sudah ada tapi nonaktif / scope-nya beda → dibetulkan.
UPDATE roles r
   SET scope_site = c.scope_site,
       active     = true
  FROM cfg_plant_team c
 WHERE r.role = 'plant_team'
   AND r.nrp IN (SELECT nrp FROM kandidat_plant_team);

-- ───────────────────────────────────────────────────────────────────────
-- 5. MENU untuk role plant_team
--    Disalin dari role acuan (gl_plant/admin_plant) supaya isinya sama
--    dengan yang sudah dipakai aplikasi, hanya untuk menu yang diizinkan.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_menu_diizinkan text[];
  v_role_acuan     text[];
  v_sumber         text;
  v_jumlah         int := 0;
  v_kolom_href     boolean;
  v_kolom_parent   boolean;
  v_sql            text;
BEGIN
  SELECT menu_diizinkan, role_acuan_menu INTO v_menu_diizinkan, v_role_acuan FROM cfg_plant_team LIMIT 1;

  SELECT m.role INTO v_sumber
  FROM menus m
  WHERE m.role = ANY (v_role_acuan)
    AND m.active = true
    AND m.menu_key = ANY (v_menu_diizinkan)
  GROUP BY m.role
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'menus' AND column_name = 'href')     INTO v_kolom_href;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'menus' AND column_name = 'parent_menu_key') INTO v_kolom_parent;

  IF v_sumber IS NULL THEN
    -- Fallback: tulis menu Plant standar secara manual.
    INSERT INTO menus (role, menu_key, menu_label, menu_icon, menu_group, sort_order, active)
    VALUES
      ('plant_team','plant_logistik','Logistik & Gudang Site','📦','Plant',25,true),
      ('plant_team','plant_dashboard','Katalog & Kru Plant','🛠️','Plant',26,true),
      ('plant_team','plant_inspeksi','Inspeksi P2H (Harian)','📋','Plant',28,true)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_jumlah = ROW_COUNT;
    RAISE NOTICE 'Role acuan menu tidak ditemukan — % menu Plant standar dibuat manual.', v_jumlah;
  ELSE
    v_sql := 'INSERT INTO menus (role, menu_key, menu_label, menu_icon, menu_group, sort_order, active'
             || CASE WHEN v_kolom_href   THEN ', href' ELSE '' END
             || CASE WHEN v_kolom_parent THEN ', parent_menu_key' ELSE '' END
             || ') SELECT ''plant_team'', m.menu_key, m.menu_label, m.menu_icon, m.menu_group, m.sort_order, true'
             || CASE WHEN v_kolom_href   THEN ', m.href' ELSE '' END
             || CASE WHEN v_kolom_parent THEN ', m.parent_menu_key' ELSE '' END
             || ' FROM menus m
                  WHERE m.role = $1
                    AND m.active = true
                    AND m.menu_key = ANY ($2)
                    AND NOT EXISTS (SELECT 1 FROM menus x
                                     WHERE x.role = ''plant_team'' AND x.menu_key = m.menu_key)';

    EXECUTE v_sql USING v_sumber, v_menu_diizinkan;
    GET DIAGNOSTICS v_jumlah = ROW_COUNT;

    RAISE NOTICE 'Menu disalin dari role acuan "%" → plant_team: % baris baru.', v_sumber, v_jumlah;

    -- Pastikan menu plant_team yang sudah ada tetap aktif.
    UPDATE menus
       SET active = true
     WHERE role = 'plant_team'
       AND menu_key = ANY (v_menu_diizinkan);
  END IF;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- 6. VERIFIKASI (jalankan setelah COMMIT — hanya membaca)
-- ═══════════════════════════════════════════════════════════════════════

-- 6a. Jumlah & scope role plant_team → harus 22 dan semuanya PPA-MLP
SELECT COUNT(*)                              AS total_role_plant_team,
       COUNT(*) FILTER (WHERE scope_site = 'PPA-MLP') AS scope_ppa_mlp,
       COUNT(*) FILTER (WHERE COALESCE(active,false) = false) AS nonaktif
FROM roles
WHERE role = 'plant_team';

-- 6b. Daftar akun plant_team + site karyawannya (site boleh NULL untuk 2 NRP khusus)
SELECT r.nrp, e.nama, e.jabatan, COALESCE(e.site,'(NULL)') AS site_karyawan, r.scope_site, r.active
FROM roles r
LEFT JOIN employees e ON e.nrp = r.nrp
WHERE r.role = 'plant_team'
ORDER BY e.jabatan, e.nama;

-- 6c. Menu yang dimiliki role plant_team
SELECT menu_key, menu_label, menu_group, sort_order, active
FROM menus
WHERE role = 'plant_team'
ORDER BY sort_order;

-- 6d. Pastikan kolom employees.site untuk 2 NRP khusus TIDAK berubah (harus NULL)
SELECT nrp, nama, site
FROM employees
WHERE nrp IN ('2400926','2410926');
