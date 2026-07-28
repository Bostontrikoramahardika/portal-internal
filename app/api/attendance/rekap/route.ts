import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

const HO_ROLES    = ['super_admin','hr_ho','director_ops','business_dev','manager_ops','spv_she_ho']
const SITE_ROLES  = ['hr_site','pjo_site','she_site']
const LEADER_ROLES = ['gl_produksi','gl_plant']

function hitungSummary(rows: any[]) {
  const totalHadir         = rows.filter(r => r.status === 'HADIR').length
  const totalAlpha         = rows.filter(r => r.status === 'ALPHA').length
  const totalIzin          = rows.filter(r => r.status === 'IZIN').length
  const totalSakit         = rows.filter(r => r.status === 'SAKIT').length
  const totalTerlambat     = rows.filter(r => (r.terlambat_menit || 0) > 0).length
  const totalTidakClockOut = rows.filter(r => r.status === 'TIDAK CLOCK OUT').length
  const totalJamKerja      = rows.reduce((acc, r) => acc + (r.jam_kerja_menit || 0), 0)
  const rataJamKerja       = rows.length > 0 ? Math.round(totalJamKerja / rows.length) : 0
  return {
    totalHadir, totalAlpha, totalIzin, totalSakit,
    totalTerlambat, totalTidakClockOut,
    totalJamKerja, rataJamKerja, totalRows: rows.length
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
   const session: any = auth.session

  // Employee biasa tidak boleh akses rekap
  if (session.role === 'employee') {
    return NextResponse.json({ error: 'Tidak punya akses rekap absensi' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const bulan  = searchParams.get('bulan')  || ''   // format: 2026-07
  const site   = searchParams.get('site')   || ''
  const nama   = searchParams.get('nama')   || ''
  const nrp    = searchParams.get('nrp')    || ''
  const role   = searchParams.get('role')   || ''
  const page   = parseInt(searchParams.get('page')  || '1')
  const limit  = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  // ── Dapatkan list NRP yang boleh dilihat ──────────────────
  let allowedNrps: string[] | null = null  // null = semua boleh

  if (SITE_ROLES.includes(session.role)) {
    // HR Site / PJO hanya lihat site sendiri
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('nrp')
      .eq('site', session.site || '')
      .eq('status_karyawan', 'Aktif')
    allowedNrps = (emp || []).map((e: any) => e.nrp)

  } else if (LEADER_ROLES.includes(session.role)) {
    // GL / PJO Site → lihat bawahan (via atasan_nrp atau pjo_nrp)
    const { data: bawahan } = await supabaseAdmin
      .from('approval_matrix')
      .select('employee_nrp')
      .or(`atasan_nrp.eq.${session.nrp},pjo_nrp.eq.${session.nrp}`)
      .eq('active', true)
    allowedNrps = (bawahan || []).map((b: any) => b.employee_nrp)
    if (allowedNrps.length === 0) {
      return NextResponse.json({
        ok: true, data: [], total: 0, page, limit,
        summary: hitungSummary([])
      })
    }
  }
  // HO roles → allowedNrps tetap null (lihat semua)

  // ── Filter role karyawan ──────────────────────────────────
  let nrpByRole: string[] | null = null
  if (role) {
    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('nrp')
      .eq('role', role)
    nrpByRole = (roleData || []).map((r: any) => r.nrp)
    if (nrpByRole.length === 0) {
      return NextResponse.json({
        ok: true, data: [], total: 0, page, limit,
        summary: hitungSummary([])
      })
    }
  }

  // ── Build query attendance ────────────────────────────────
  let query = supabaseAdmin
    .from('attendance')
    .select(`
      id, nrp, tanggal, shift,
      clock_in, clock_out,
      clock_in_lokasi, clock_out_lokasi,
      jam_kerja_menit, terlambat_menit,
      status, keterangan, site,
      is_offline_sync
    `, { count: 'exact' })

  // Filter bulan
  if (bulan) {
    const [tahun, bln] = bulan.split('-')
    const y = parseInt(tahun), m = parseInt(bln)
    const startDate = `${tahun}-${bln}-01`
    const endDate   = new Date(y, m, 0).toISOString().split('T')[0]
    query = query.gte('tanggal', startDate).lte('tanggal', endDate)
  }

  // Filter site
  if (site) {
    query = query.eq('site', site)
  } else if (SITE_ROLES.includes(session.role)) {
    query = query.eq('site', session.site || '')
  }

  // Filter NRP spesifik
  if (nrp) {
    query = query.eq('nrp', nrp)
  }

  // Filter allowed NRPs (scope role)
  if (allowedNrps !== null) {
    query = query.in('nrp', allowedNrps)
  }

  // Filter role karyawan
  if (nrpByRole !== null) {
    query = query.in('nrp', nrpByRole)
  }

  query = query
    .order('tanggal', { ascending: false })
    .order('nrp',     { ascending: true  })
    .range(offset, offset + limit - 1)

  const { data: attendanceData, error, count } = await query

  if (error) {
    console.error('Rekap error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Join data employees ───────────────────────────────────
  const nrpList = [...new Set((attendanceData || []).map((a: any) => a.nrp))]
  let employeeMap: Record<string, any> = {}

  if (nrpList.length > 0) {
    let empQuery = supabaseAdmin
      .from('employees')
      .select('nrp, nama, site, jabatan, departemen')
      .in('nrp', nrpList)

    // Filter nama
    if (nama) empQuery = empQuery.ilike('nama', `%${nama}%`)

    const { data: empData } = await empQuery
    ;(empData || []).forEach((e: any) => { employeeMap[e.nrp] = e })
  }

  // Gabungkan + filter nama
  let rows = (attendanceData || []).map((a: any) => ({
    ...a,
    employee: employeeMap[a.nrp] || { nrp: a.nrp, nama: '-', site: a.site, jabatan: '-', departemen: '-' }
  }))

  // Kalau filter nama, hapus yang tidak match
  if (nama) {
    rows = rows.filter(r => r.employee.nama !== '-')
  }

  // Summary dari data halaman ini
  const summary = hitungSummary(rows)

  return NextResponse.json({
    ok: true,
    data: rows,
    total: count || 0,
    page,
    limit,
    summary
  })
}