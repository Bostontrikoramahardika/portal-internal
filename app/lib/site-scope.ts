// app/lib/site-scope.ts
// ────────────────────────────────────────────────────────────────
// Helper scope site & pemeriksaan role untuk API route.
// Dipakai oleh modul Plant (Team Plant / plant_team), APD Plan, dan Part Orders.
// Tujuan: identitas & site TIDAK BOLEH dipercaya dari browser.
// ────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '@/app/lib/supabase'

/** Role khusus tim lapangan Plant (mekanik, helper, welder). */
export const PLANT_TEAM_ROLE = 'plant_team'

/** Role yang boleh menyetujui / menolak PR. */
const PR_APPROVER_ROLES = [
  'super_admin',
  'gl_plant',
  'gl_produksi',
  'pjo_site',
  'pjo',
  'manager_ops',
  'director_ops',
  'business_dev',
  'hr_ho',
  'spv_she_ho',
  'hr_site',
  'she_site',
  'admin_plant',
  'admin_site',
  'admin',
  'logistik',
  'admin_logistik',
  'logistik_site',
]

/** Role yang boleh mengubah stok (LPB / pengeluaran / cross-check). */
const STOCK_MANAGER_ROLES = PR_APPROVER_ROLES.filter(
  (r) => r !== 'hr_site' && r !== 'she_site'
)

export function normalizeSiteValue(value: unknown): string {
  return String(value == null ? '' : value).trim()
}

export function getSessionRoles(session: any): string[] {
  if (!session) return []
  const raw = Array.isArray(session.roles) ? session.roles : []
  return raw
    .map((r: any) => normalizeSiteValue(r).toLowerCase())
    .filter(Boolean)
}

export function hasAnyRole(session: any, allowed: string[]): boolean {
  if (!session) return false
  if (session.is_super_admin) return true
  const mine = getSessionRoles(session)
  if (mine.length === 0) return false
  return allowed.some((role) => mine.includes(String(role).toLowerCase()))
}

/** True kalau user punya role plant_team (mekanik / helper / welder Plant). */
export function isPlantTeam(session: any): boolean {
  return getSessionRoles(session).includes(PLANT_TEAM_ROLE)
}

/**
 * True kalau user boleh approve/reject PR.
 * plant_team SELALU ditolak di sini (boleh lihat, tidak boleh menyetujui).
 */
export function canApprovePurchaseRequest(session: any): boolean {
  if (isPlantTeam(session)) return false
  return hasAnyRole(session, PR_APPROVER_ROLES)
}

/** True kalau user boleh mengubah stok / catat LPB / cross-check barang. */
export function canManageStock(session: any): boolean {
  if (isPlantTeam(session)) return false
  return hasAnyRole(session, STOCK_MANAGER_ROLES)
}

/** True kalau user boleh melihat data lintas site (HO / super admin). */
export function isCrossSiteUser(session: any): boolean {
  if (!session) return false
  if (session.is_super_admin) return true
  const mine = getSessionRoles(session)
  return mine.some((r) => r.includes('ho') || r.includes('superadmin'))
}

/**
 * Kumpulkan semua penulisan nama site yang valid untuk scope user.
 * Contoh: scope "PPA-MLP" bisa muncul di data sebagai:
 *   - "PPA-MLP"            (kode_site)
 *   - "MLP"                (kode pendek, dipakai modul logistik)
 *   - "PT BOSTON ... PPA-MLP" (nama_site, dipakai tabel employees)
 */
export async function getScopeSiteValues(session: any): Promise<string[]> {
  const scope = normalizeSiteValue((session as any)?.scope_site)
  if (!scope) return []

  const values = new Set<string>([scope])

  // Cari pasangan kode_site / nama_site di sites_config (dua query terpisah
  // supaya nilai yang mengandung spasi / tanda baca tidak merusak filter).
  try {
    const byKode = await supabaseAdmin
      .from('sites_config')
      .select('kode_site, nama_site')
      .eq('kode_site', scope)
      .maybeSingle()

    const byNama = byKode?.data
      ? { data: null as any }
      : await supabaseAdmin
          .from('sites_config')
          .select('kode_site, nama_site')
          .eq('nama_site', scope)
          .maybeSingle()

    for (const row of [byKode?.data, byNama?.data]) {
      if (!row) continue
      if (row.kode_site) values.add(normalizeSiteValue(row.kode_site))
      if (row.nama_site) values.add(normalizeSiteValue(row.nama_site))
    }
  } catch {
    // Kalau sites_config tidak bisa dibaca, tetap pakai nilai scope mentah.
  }

  // Kode pendek: "PPA-MLP" → "MLP", "PPA-BTM" → "BTM".
  for (const value of Array.from(values)) {
    const parts = value
      .split(/[-–—]/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length > 1) values.add(parts[parts.length - 1])
  }

  return Array.from(values).filter(Boolean)
}

/**
 * Nilai site tunggal untuk DISIMPAN ke tabel (mis. purchase_requests.site,
 * stock_movements.site, inspeksi_unit.site).
 * Scope "PPA-MLP" ditulis sebagai "MLP" supaya konsisten dengan data lama
 * yang dibuat modul logistik.
 */
export async function resolvePrimarySiteValue(session: any): Promise<string | null> {
  const scope = normalizeSiteValue((session as any)?.scope_site)
  if (scope) {
    const parts = scope.split(/[-–—]/).map((p) => p.trim()).filter(Boolean)
    return parts.length > 1 ? parts[parts.length - 1] : scope
  }
  const employeeSite = normalizeSiteValue((session as any)?.site)
  return employeeSite || null
}

/**
 * Site yang boleh dipakai untuk query data.
 * - plant_team / user ber-scope : dipaksa ke scope-nya
 * - HO / super admin            : bebas (semua site)
 */
export async function resolveAllowedSites(
  session: any,
  requestedSite?: string | null
): Promise<{ sites: string[]; restricted: boolean }> {
  if (isCrossSiteUser(session)) {
    const req = normalizeSiteValue(requestedSite)
    return { sites: req && req !== 'ALL' ? [req] : [], restricted: false }
  }

  const scopeValues = await getScopeSiteValues(session)
  if (scopeValues.length > 0) {
    return { sites: scopeValues, restricted: true }
  }

  // Tidak punya scope (mis. role lama tanpa scope_site): pakai site karyawan.
  const fallback = normalizeSiteValue((session as any)?.site)
  if (fallback) return { sites: [fallback], restricted: true }

  return { sites: [], restricted: false }
}
