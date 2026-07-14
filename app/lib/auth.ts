// app/lib/auth.ts (v1.5.0 - Multi-Role Support)

import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

// Priority role tertinggi ke terendah (untuk primaryRole)
// v2.0 - Updated sesuai struktur organisasi BTM
const ROLE_PRIORITY = [
  // ── Level 0: Super Admin ──
  'super_admin',

  // ── Level 1: HO Executive ──
  'director_ops',
  'business_dev',

  // ── Level 2: HO Staff ──
  'hr_ho',
  'manager_ops',
  'spv_she_ho',

  // ── Level 3: Site Leader ──
  'pjo_site',
  'hr_site',
  'she_site',

  // ── Level 4: Team Leader ──
  'gl_produksi',
  'gl_plant',

  // ── Level 5: Karyawan ──
  'employee',

  // ── Legacy (backward compat) ──
  'hrga_oprek',
  'hrga_pusat',
  'hrga_site',
  'hrga',
  'admin_site',
  'admin_plant',
  'admin',
  'pjo',
  'atasan',
  'karyawan'
]

export async function loginByNrp(nrp: string) {
  // 1. Cari karyawan by NRP LOGIN (bisa dari kolom nrp_login atau nrp)
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .or(`nrp.eq.${nrp},nrp_login.eq.${nrp}`)
    .eq('status_karyawan', 'Aktif')
    .single()

  if (empError || !employee) {
    throw new Error('NRP tidak terdaftar atau tidak aktif.')
  }

  const realNrp = employee.nrp
  const isSuperAdmin = Boolean(employee.is_super_admin)
  const permissions = await getUserPermissions(realNrp, isSuperAdmin)

  // 2. Ambil roles + scope_site
  const { data: roleRows } = await supabase
    .from('roles')
    .select('role, scope_site')
    .eq('nrp', realNrp)
    .eq('active', true)

  const roles = (roleRows || []).map(r => r.role)
  if (!roles.includes('karyawan')) roles.push('karyawan')
  
  // Ambil scope_site dari role yang punya scope (biasanya hrga_site/admin_site)
  const scopeSite = (roleRows || []).find(r => r.scope_site)?.scope_site || null

  // 3. Buat session token
  const token = uuidv4()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 8)

  const { error: sessError } = await supabase
    .from('sessions')
    .insert({
      token,
      nrp: realNrp,
      roles,
      scope_site: scopeSite,   // 🌟 v1.5.0
      expires_at: expiresAt.toISOString()
    })

  if (sessError) {
    // Fallback jika kolom scope_site belum ada di tabel sessions
    console.warn('Session insert warning:', sessError.message)
    await supabase.from('sessions').insert({
      token, nrp: realNrp, roles, expires_at: expiresAt.toISOString()
    })
  }

  return {
    token,
    nrp: realNrp,
    nama: employee.nama,
    roles,
    scope_site: scopeSite,
    primaryRole: getPrimaryRole(roles),
    is_super_admin: isSuperAdmin,
    permissions
  }
}

export async function getSession(token: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null

    const { data: emp } = await supabase
    .from('employees')
    .select('id, nama, site, jabatan, departemen, is_super_admin')
    .eq('nrp', data.nrp)
    .single()

  // 🌟 v1.5.0: Ambil scope_site dari session ATAU dari roles (fallback)
  let scopeSite = data.scope_site || null
  if (!scopeSite) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('scope_site')
      .eq('nrp', data.nrp)
      .eq('active', true)
      .not('scope_site', 'is', null)
      .limit(1)
      .single()
    scopeSite = roleData?.scope_site || null
  }

  const isSuperAdmin = Boolean(emp?.is_super_admin)
  const permissions = await getUserPermissions(data.nrp, isSuperAdmin)

  return {
    token: data.token,
    nrp: data.nrp,
    nama: emp?.nama || data.nrp,
    site: emp?.site || null,
    jabatan: emp?.jabatan || null,
    departemen: emp?.departemen || null,
    roles: data.roles,
    scope_site: scopeSite,
    primaryRole: getPrimaryRole(data.roles),
    is_super_admin: isSuperAdmin,
    permissions
  }
}

export async function logout(token: string) {
  await supabase.from('sessions').delete().eq('token', token)
}

// ✅ TAMBAHKAN BLOK INI — letakkan tepat di atas function getPrimaryRole
export async function getUserPermissions(
  nrp: string,
  isSuperAdmin: boolean
): Promise<string[]> {
  
  // Kalau super admin, langsung ambil semua permission yang ada
  if (isSuperAdmin) {
    const { data } = await supabase
      .from('master_permissions')
      .select('perm_key')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    
    return (data || []).map((row: any) => row.perm_key).filter(Boolean)
  }

  // Kalau bukan super admin, ambil dari user_permissions by NRP
  const { data: permRows } = await supabase
    .from('user_permissions')
    .select('perm_key')
    .eq('nrp', nrp)

  return (permRows || []).map((row: any) => row.perm_key).filter(Boolean).sort()
}

// ✅ SELESAI — baris di bawah ini adalah function getPrimaryRole yang sudah ada
function getPrimaryRole(roles: string[]): string {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r
  }
  return 'karyawan'
}