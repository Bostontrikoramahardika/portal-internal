// app/api/kelola-akses/google/route.ts
// API untuk kelola akses Google Integration per karyawan
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// Role yang boleh kelola akses Google
const ALLOWED_ROLES = [
  'super_admin', 'hr_ho', 'director_ops', 'business_dev', 
  'manager_ops', 'spv_she_ho', 'pjo_site', 'admin_site'
]

// ═══ GET — Statistik akses Google ═══
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  if (!ALLOWED_ROLES.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const { data: allEmps } = await supabaseAdmin
      .from('employees')
      .select('nrp, google_access_enabled, google_email')
      .is('tanggal_resign', null)

    const total = (allEmps || []).length
    const enabled = (allEmps || []).filter((e: any) => e.google_access_enabled).length
    const connected = (allEmps || []).filter((e: any) => e.google_email).length

    return NextResponse.json({
      ok: true,
      stats: { total, enabled, disabled: total - enabled, connected }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══ POST — Toggle single atau bulk preset ═══
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  if (!ALLOWED_ROLES.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const isSuperAdmin = userRoles.includes('super_admin')

  try {
    const body = await req.json()
    const { action } = body

    // ─── TOGGLE_SINGLE ───
    if (action === 'TOGGLE_SINGLE') {
      const { target_nrp, enabled } = body
      if (!target_nrp) {
        return NextResponse.json({ error: 'target_nrp wajib' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('employees')
        .update({ google_access_enabled: !!enabled })
        .eq('nrp', target_nrp)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({
        ok: true,
        message: `Akses Google ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`
      })
    }

    // ─── BULK_PRESET (super_admin only) ───
    if (action === 'BULK_PRESET') {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Hanya super_admin yang boleh bulk preset' }, { status: 403 })
      }

      const { preset } = body
      // preset: 'ALL_ON' | 'ALL_OFF' | 'LEADER_UP' | 'HR_ONLY'

      if (preset === 'ALL_ON') {
        const { error } = await supabaseAdmin
          .from('employees')
          .update({ google_access_enabled: true })
          .is('tanggal_resign', null)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true, message: 'Semua karyawan aktif diberi akses Google' })
      }

      if (preset === 'ALL_OFF') {
        const { error } = await supabaseAdmin
          .from('employees')
          .update({ google_access_enabled: false })
          .is('tanggal_resign', null)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true, message: 'Semua akses Google dinonaktifkan' })
      }

      if (preset === 'LEADER_UP') {
        const LEADER_ROLES = [
          'super_admin', 'director_ops', 'business_dev', 'manager_ops',
          'hr_ho', 'hr_site', 'pjo_site', 'gl_produksi', 'gl_plant',
          'admin_site', 'admin_plant', 'spv_she_ho', 'she_site'
        ]
        const { data: leaderRoles } = await supabaseAdmin
          .from('roles')
          .select('nrp')
          .in('role', LEADER_ROLES)

        const leaderNrps = [...new Set((leaderRoles || []).map((r: any) => r.nrp))]

        // Reset semua dulu ke false
        await supabaseAdmin
          .from('employees')
          .update({ google_access_enabled: false })
          .is('tanggal_resign', null)

        // Enable leader
        if (leaderNrps.length > 0) {
          await supabaseAdmin
            .from('employees')
            .update({ google_access_enabled: true })
            .in('nrp', leaderNrps)
        }

        return NextResponse.json({
          ok: true,
          message: `Preset "Leader Up" diterapkan. ${leaderNrps.length} karyawan diaktifkan.`
        })
      }

      if (preset === 'HR_ONLY') {
        const HR_ROLES = ['super_admin', 'hr_ho', 'hr_site', 'admin_site']
        const { data: hrRoles } = await supabaseAdmin
          .from('roles')
          .select('nrp')
          .in('role', HR_ROLES)

        const hrNrps = [...new Set((hrRoles || []).map((r: any) => r.nrp))]

        await supabaseAdmin
          .from('employees')
          .update({ google_access_enabled: false })
          .is('tanggal_resign', null)

        if (hrNrps.length > 0) {
          await supabaseAdmin
            .from('employees')
            .update({ google_access_enabled: true })
            .in('nrp', hrNrps)
        }

        return NextResponse.json({
          ok: true,
          message: `Preset "HR Only" diterapkan. ${hrNrps.length} karyawan diaktifkan.`
        })
      }

      return NextResponse.json({ error: 'Preset tidak dikenal' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}