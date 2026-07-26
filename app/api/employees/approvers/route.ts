// app/api/employees/approvers/route.ts — v1.0
// GET daftar approver (GL/PJO/HR) sesuai departemen karyawan
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const nrp = session.nrp

  // ═══ 1. Ambil data karyawan (site + departemen) ═══
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('nrp, nama, site, departemen, jabatan')
    .eq('nrp', nrp)
    .single()

  if (!emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

  // ═══ 2. Tentukan role approver berdasarkan departemen ═══
  // Aturan bisnis:
  // - Karyawan Plant/mekanik → GL Plant
  // - Karyawan Produksi/operator → GL Produksi
  // - Karyawan Staff → HR Site / PJO (fallback)
  
  const dept = (emp.departemen || '').toLowerCase()
  const jabatan = (emp.jabatan || '').toLowerCase()
  
  let primaryRoles: string[] = []
  let fallbackRoles: string[] = ['pjo_site', 'hr_site']

  if (dept.includes('plant') || jabatan.includes('mekanik') || jabatan.includes('welder')) {
    primaryRoles = ['gl_plant']
  } else if (dept.includes('produksi') || dept.includes('operator') || jabatan.includes('operator')) {
    primaryRoles = ['gl_produksi']
  } else {
    // Staff atau lainnya → langsung ke PJO/HR
    primaryRoles = ['pjo_site', 'hr_site']
    fallbackRoles = []
  }

  const allRoles = [...primaryRoles, ...fallbackRoles]

  // ═══ 3. Ambil daftar approver di site sama ═══
  const { data: rolesData } = await supabaseAdmin
    .from('roles')
    .select('nrp, role')
    .in('role', allRoles)

  const approverNrps = (rolesData || []).map(r => r.nrp)
  if (approverNrps.length === 0) {
    return NextResponse.json({ ok: true, data: [], employee: emp })
  }

  const { data: approvers } = await supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site')
    .in('nrp', approverNrps)
    .eq('site', emp.site)
    .is('tanggal_resign', null)
    .order('nama')

  // Gabungkan dengan role info
  const roleMap: Record<string, string> = {}
  for (const r of rolesData || []) {
    if (!roleMap[r.nrp]) roleMap[r.nrp] = r.role
  }

  const result = (approvers || []).map(a => ({
    nrp: a.nrp,
    nama: a.nama,
    jabatan: a.jabatan,
    departemen: a.departemen,
    role: roleMap[a.nrp] || 'unknown',
    is_primary: primaryRoles.includes(roleMap[a.nrp] || ''),
    is_fallback: fallbackRoles.includes(roleMap[a.nrp] || '')
  }))

  // Sort: primary dulu (GL), lalu fallback (PJO/HR)
  result.sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.nama.localeCompare(b.nama)
  })

  return NextResponse.json({
    ok: true,
    data: result,
    employee: {
      nrp: emp.nrp,
      nama: emp.nama,
      site: emp.site,
      departemen: emp.departemen,
      jabatan: emp.jabatan
    },
    primary_roles: primaryRoles,
    fallback_roles: fallbackRoles
  })
}