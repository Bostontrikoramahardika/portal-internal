// app/api/kelola-hak-cuti/route.ts
// Kelola hak tiket & saldo cuti tahunan karyawan
// GET  → list karyawan + status eligible & saldo
// POST → update eligible_tiket_pesawat / saldo tahunan

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { logAudit } from '@/app/lib/auditLog'

export const dynamic = 'force-dynamic'

// Helper: cek role
function canEdit(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) => ['hr_site', 'hrga_site'].includes(r))
}

function canView(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    ['hr_site', 'hrga_site', 'hr_ho', 'hrga', 'hrga_pusat', 'admin'].includes(r)
  )
}

// ================================================
// GET: list karyawan + eligible + saldo cuti tahunan
// ================================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canView(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const site = searchParams.get('site') || ''
    const searchQ = (searchParams.get('search') || '').toLowerCase()
    const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear()

    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isSuperAdmin = session.is_super_admin || false
    const isHRHO = rolesLower.some((r: string) =>
      ['hr_ho', 'hrga', 'hrga_pusat', 'admin'].includes(r)
    )
    const isHRSite = rolesLower.some((r: string) =>
      ['hr_site', 'hrga_site'].includes(r)
    )
    const userSite = session.scope_site || session.site || ''

    // 1. Ambil karyawan
    let empQuery = supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, eligible_tiket_pesawat')
      .eq('status_karyawan', 'Aktif')
      .order('nama')

    // Scope: HR Site → cuma site sendiri
    if (isHRSite && !isSuperAdmin && !isHRHO) {
      empQuery = empQuery.eq('site', userSite)
    }

    if (site) empQuery = empQuery.eq('site', site)

    const { data: emps } = await empQuery

    // 2. Filter search
    let filtered = emps || []
    if (searchQ) {
      filtered = filtered.filter((e: any) =>
        (e.nama || '').toLowerCase().includes(searchQ) ||
        (e.nrp || '').toLowerCase().includes(searchQ)
      )
    }

    // 3. Ambil saldo cuti untuk tahun tersebut
    const nrps = filtered.map((e: any) => e.nrp)
    let balanceMap = new Map<string, any>()

    if (nrps.length > 0) {
      const { data: balances } = await supabase
        .from('annual_leave_balances')
        .select('nrp, hak_awal, terpakai, penyesuaian')
        .eq('tahun', tahun)
        .in('nrp', nrps)

      ;(balances || []).forEach((b: any) => balanceMap.set(String(b.nrp), b))
    }

    // 4. Gabung
    const rows = filtered.map((e: any) => {
      const b = balanceMap.get(String(e.nrp))
      const hakAwal = Number(b?.hak_awal ?? 12)
      const terpakai = Number(b?.terpakai ?? 0)
      const penyesuaian = Number(b?.penyesuaian ?? 0)
      const sisa = Math.max(0, hakAwal + penyesuaian - terpakai)

      return {
        nrp: e.nrp,
        nama: e.nama,
        jabatan: e.jabatan,
        departemen: e.departemen,
        site: e.site,
        eligible_tiket_pesawat: !!e.eligible_tiket_pesawat,
        hak_awal: hakAwal,
        terpakai,
        penyesuaian,
        sisa
      }
    })

    // 5. Sites list untuk filter
    const { data: sitesList } = await supabase
      .from('sites_config')
      .select('nama_site')
      .eq('is_active', true)
      .order('nama_site')

    return NextResponse.json({
      rows,
      total: rows.length,
      tahun,
      can_edit: canEdit(session),
      is_view_only: !canEdit(session),
      sites: (sitesList || []).map((s: any) => s.nama_site)
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ================================================
// POST: update eligible / saldo cuti tahunan
// ================================================
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canEdit(session)) {
      return NextResponse.json({ error: 'Anda tidak berhak mengedit (HR HO hanya view)' }, { status: 403 })
    }

    const body = await request.json()
    const { action, nrp, payload } = body

    if (!action || !nrp) {
      return NextResponse.json({ error: 'action & nrp wajib diisi' }, { status: 400 })
    }

    // ─── ACTION 1: Toggle eligible tiket ───
    if (action === 'toggle_eligible') {
      const eligible = !!payload?.eligible

      const { error } = await supabase
        .from('employees')
        .update({ eligible_tiket_pesawat: eligible })
        .eq('nrp', nrp)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await logAudit({
        req: request,
        actor_nrp: session.nrp,
        actor_nama: session.nama,
        actor_role: (session.roles || []).join(','),
        action: 'update_employee',
        category: 'EMPLOYEE',
        target_type: 'employee',
        target_id: nrp,
        target_label: `Toggle Hak Tiket Pesawat → ${eligible ? 'ON' : 'OFF'}`,
        status: 'SUCCESS',
        detail: { eligible_tiket_pesawat: eligible }
      })

      return NextResponse.json({
        success: true,
        message: `Hak tiket pesawat karyawan berhasil di-${eligible ? 'aktifkan' : 'nonaktifkan'}`
      })
    }

    // ─── ACTION 2: Update saldo cuti tahunan ───
    if (action === 'update_balance') {
      const tahun = Number(payload?.tahun) || new Date().getFullYear()
      const hakAwal = Number(payload?.hak_awal ?? 12)
      const terpakai = Number(payload?.terpakai ?? 0)
      const penyesuaian = Number(payload?.penyesuaian ?? 0)

      if (hakAwal < 0 || terpakai < 0) {
        return NextResponse.json({ error: 'Hak awal & terpakai tidak boleh negatif' }, { status: 400 })
      }

      const { error } = await supabase
        .from('annual_leave_balances')
        .upsert(
          {
            nrp,
            tahun,
            hak_awal: hakAwal,
            terpakai,
            penyesuaian,
            updated_by: session.nrp,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'nrp,tahun' }
        )

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await logAudit({
        req: request,
        actor_nrp: session.nrp,
        actor_nama: session.nama,
        actor_role: (session.roles || []).join(','),
        action: 'update_employee',
        category: 'EMPLOYEE',
        target_type: 'annual_leave_balance',
        target_id: nrp,
        target_label: `Update Saldo Cuti Tahunan ${tahun}`,
        status: 'SUCCESS',
        detail: { tahun, hak_awal: hakAwal, terpakai, penyesuaian }
      })

      const sisa = Math.max(0, hakAwal + penyesuaian - terpakai)

      return NextResponse.json({
        success: true,
        message: `Saldo cuti tahunan ${tahun} berhasil diupdate. Sisa: ${sisa} hari`
      })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}