// app/lib/jabatan-role.ts
// ────────────────────────────────────────────────────────────────
// ATURAN BAKU JABATAN → DEPARTEMEN → ROLE
//
// Tujuan: berhenti mengandalkan tulisan jabatan di Excel. Tulisan
// bebas seperti "Production GL", "GL Produksi", "prod gl" semuanya
// dibaca sebagai satu hal yang sama, lalu:
//   1. jabatan  disimpan dalam BENTUK BAKU
//   2. departemen diisi baku (kalau aturannya tahu)
//   3. role struktural ditentukan (tabel `roles`)
//
// Prinsip:
//   * TIDAK MENGARANG. Jabatan yang tidak dikenali aturan -> tidak
//     diubah, tidak diberi role, hanya diberi peringatan.
//   * Role lama TIDAK PERNAH dihapus otomatis. Aturan hanya menambah.
//   * Bentuk baku jabatan mengikuti daftar di app/api/schema/route.ts.
// ────────────────────────────────────────────────────────────────

export type AturanJabatan = {
  /** Jabatan bentuk baku (yang disimpan ke database). */
  baku: string
  /** Departemen baku. null = jangan disentuh (tidak yakin). */
  departemen: string | null
  /** Role struktural di tabel `roles`. null = cukup role dasar employee. */
  role: string | null
  /** Semua tulisan yang diterima untuk jabatan ini. */
  alias: RegExp[]
  /** Kelompok, untuk pesan & pengelompokan di laporan import. */
  kelompok: 'site_leader' | 'team_leader' | 'plant' | 'produksi' | 'ho' | 'administrasi'
}

/**
 * Daftar aturan. Urutan penting: yang paling spesifik di atas.
 * Pola ditulis jangkar (^...$) supaya "Admin GL" tidak tertangkap "GL".
 */
export const ATURAN_JABATAN: AturanJabatan[] = [
  // ── Level 3 — Site Leader ──────────────────────────────────────
  {
    baku: 'PJO', departemen: 'Site Management', role: 'pjo_site', kelompok: 'site_leader',
    alias: [/^pjo$/i, /^pjo\s*site$/i, /^project\s*(manager|officer)$/i, /^kepala\s*teknik$/i],
  },
  {
    // Deputy PJO tetap ikut role pjo_site (keputusan user, jangan role baru)
    baku: 'Deputy PJO', departemen: 'Site Management', role: 'pjo_site', kelompok: 'site_leader',
    alias: [/^deputy\s*pjo$/i, /^wakil\s*pjo$/i, /^deputy\s*site$/i, /^dpjo$/i],
  },
  {
    baku: 'HRGA', departemen: 'HRGA', role: 'hr_site', kelompok: 'site_leader',
    alias: [/^hrga$/i, /^hrga\s*site$/i, /^hr\s*site$/i, /^hrd$/i],
  },
  {
    baku: 'SHE Officer', departemen: 'SHE', role: 'she_site', kelompok: 'site_leader',
    alias: [/^she(\s*officer)?$/i, /^safety(\s*officer)?$/i, /^hse$/i, /^k3$/i],
  },

  // ── Level 4 — Team Leader ──────────────────────────────────────
  {
    // ⚠️ INI YANG SERING SALAH: "Production GL" = GL PRODUKSI
    baku: 'Production GL', departemen: 'Produksi', role: 'gl_produksi', kelompok: 'team_leader',
    alias: [
      /^production\s*gl$/i, /^gl\s*produksi$/i, /^produksi\s*gl$/i,
      /^prod\s*gl$/i, /^gl\s*prod$/i, /^production\s*(leader|spv|supervisor)$/i,
      /^gl\s*production$/i, /^group\s*leader\s*produksi$/i,
    ],
  },
  {
    baku: 'Plant GL', departemen: 'Plant', role: 'gl_plant', kelompok: 'team_leader',
    alias: [
      /^plant\s*gl$/i, /^gl\s*plant$/i, /^gl\s*plantasi$/i,
      /^plant\s*(leader|spv|supervisor)$/i, /^group\s*leader\s*plant$/i,
    ],
  },

  // ── Level 5 — Team Plant ──────────────────────────────────────
  {
    baku: 'Mechanic A2B', departemen: 'Plant', role: 'plant_team', kelompok: 'plant',
    alias: [/^mechanic(\s*a2b)?$/i, /^mekanik(\s*a2b)?$/i, /^mechanic\s*.*$/i, /^mekanik\s*.*$/i],
  },
  {
    baku: 'Welder', departemen: 'Plant', role: 'plant_team', kelompok: 'plant',
    alias: [/^welder$/i, /^welding$/i, /^las$/i, /^tukang\s*las$/i],
  },
  {
    baku: 'Helper Plant', departemen: 'Plant', role: 'plant_team', kelompok: 'plant',
    alias: [/^helper(\s*plant)?$/i, /^helper\s*plant$/i, /^pembantu\s*plant$/i],
  },
  {
    baku: 'Electric', departemen: 'Plant', role: 'plant_team', kelompok: 'plant',
    alias: [/^electric(ian)?$/i, /^elektrik$/i],
  },

  // ── Level 6 — Produksi (operator) ─────────────────────────────
  {
    baku: 'Operator Excavator', departemen: null, role: null, kelompok: 'produksi',
    alias: [/^operator\s*excavator$/i, /^excavator$/i, /^operator\s*(pc|exca)\s*\d*$/i, /^operator\s*pc$/i],
  },
  {
    baku: 'Operator Bulldozer', departemen: null, role: null, kelompok: 'produksi',
    alias: [/^operator\s*bulldozer$/i, /^bulldozer$/i, /^operator\s*dozer$/i, /^dozer$/i],
  },
  {
    baku: 'Operator Grader', departemen: null, role: null, kelompok: 'produksi',
    alias: [/^operator\s*grader$/i, /^grader$/i, /^motor\s*grader$/i],
  },
  {
    baku: 'Operator', departemen: null, role: null, kelompok: 'produksi',
    alias: [/^operator$/i, /^operator\s*lainnya$/i, /^operator\b.*$/i],
  },

  // ── Head Office ───────────────────────────────────────────────
  {
    baku: 'HR HO', departemen: 'HRGA', role: 'hr_ho', kelompok: 'ho',
    alias: [/^hr\s*ho$/i, /^hrga\s*ho$/i, /^hr\s*pusat$/i],
  },
  {
    baku: 'SPV SHE HO', departemen: 'SHE', role: 'spv_she_ho', kelompok: 'ho',
    alias: [/^spv\s*she(\s*ho)?$/i, /^supervisor\s*she(\s*ho)?$/i],
  },
  {
    baku: 'Staff Bus Dev', departemen: 'Business Development', role: 'business_dev', kelompok: 'ho',
    // CATATAN: tulisan "Business Development" (tanpa kata Staff) SENGAJA tidak
    // dipetakan, karena jabatan itu juga dipakai Direktur Operasional.
    // Hanya "Staff Bus Dev" / "Bus Dev" yang dianggap staf.
    alias: [/^staff\s*bus\s*dev$/i, /^bus\s*dev$/i],
  },

  // ── Administrasi & pendukung (departemen sengaja tidak diisi) ──
  {
    baku: 'Site Admin', departemen: null, role: 'admin_site', kelompok: 'administrasi',
    alias: [/^site\s*admin$/i, /^admin\s*site$/i, /^administrator\s*site$/i],
  },
  {
    baku: 'Admin GL', departemen: null, role: null, kelompok: 'administrasi',
    alias: [/^admin\s*gl$/i, /^admin\s*plant$/i],
  },
  {
    baku: 'Planner', departemen: null, role: null, kelompok: 'administrasi',
    alias: [/^planner$/i, /^perencana$/i],
  },
  {
    baku: 'Logistic Crew', departemen: null, role: null, kelompok: 'administrasi',
    alias: [/^logistic\s*crew$/i, /^logistik$/i, /^logistic$/i],
  },
  {
    baku: 'Driver LV', departemen: null, role: null, kelompok: 'administrasi',
    alias: [/^driver(\s*lv)?$/i, /^pengemudi$/i],
  },
]

/** Role yang wajib punya `scope_site` di tabel roles (dibatasi site-nya). */
export const ROLE_PERLU_SCOPE_SITE = new Set([
  'pjo_site', 'hr_site', 'she_site', 'gl_plant', 'gl_produksi', 'plant_team', 'admin_site',
])

/** Role yang bersifat lintas site (tidak diberi scope site). */
export const ROLE_LINTAS_SITE = new Set([
  'hr_ho', 'spv_she_ho', 'business_dev', 'manager_ops', 'director_ops', 'super_admin',
])

/** Rapikan tulisan sebelum dicocokkan: spasi ganda, strip, garis miring. */
function bersihkan(input: unknown): string {
  return String(input == null ? '' : input)
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[._/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Baca tulisan jabatan apa pun, kembalikan aturannya.
 * null = tidak dikenali (jangan diubah, jangan diberi role).
 */
export function bacaJabatan(input: unknown): AturanJabatan | null {
  const teks = bersihkan(input)
  if (!teks) return null
  for (const aturan of ATURAN_JABATAN) {
    if (aturan.alias.some((pola) => pola.test(teks))) return aturan
  }
  return null
}

/** Role struktural untuk sebuah jabatan (null kalau tidak ada / tidak dikenali). */
export function roleUntukJabatan(input: unknown): string | null {
  return bacaJabatan(input)?.role ?? null
}

/** Daftar jabatan baku — dipakai untuk pesan bantuan & pemeriksaan. */
export function daftarJabatanBaku(): string[] {
  return ATURAN_JABATAN.map((a) => a.baku)
}

/**
 * Hasil lengkap untuk satu baris: apa yang diubah.
 * Dipakai import supaya bisa melaporkan "dari apa -> jadi apa".
 */
export function periksaJabatan(input: unknown, departemenLama?: unknown) {
  const aturan = bacaJabatan(input)
  if (!aturan) {
    return {
      dikenali: false as const,
      jabatan: null as string | null,
      departemen: null as string | null,
      role: null as string | null,
      jabatanBerubah: false,
      departemenBerubah: false,
    }
  }
  const teksAsli = String(input == null ? '' : input).replace(/\s+/g, ' ').trim()
  const deptLama = String(departemenLama == null ? '' : departemenLama).replace(/\s+/g, ' ').trim()
  const deptBaru = aturan.departemen
  return {
    dikenali: true as const,
    jabatan: aturan.baku,
    departemen: deptBaru,
    role: aturan.role,
    jabatanBerubah: teksAsli !== aturan.baku,
    departemenBerubah: !!deptBaru && deptLama.toUpperCase() !== deptBaru.toUpperCase(),
    kelompok: aturan.kelompok,
  }
}
