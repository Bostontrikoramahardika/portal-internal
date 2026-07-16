// app/api/monitoring-cuti/route.ts
// Monitoring cuti & tiket per bulan per site
// GET  → list cuti & tiket dengan filter
// POST → update status tiket per trip

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { logAudit } from '@/app/lib/auditLog'

export const dynamic = 'force-dynamic'

function canView(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    [
      'hr_site', 'hrga_site',
      'hr_ho', 'hrga', 'hrga_pusat',
      'admin', 'admin_site', 'admin_plant',
      'pjo_site', 'pjo',
      'director_ops', 'manager_ops', 'business_dev',
      'spv_she_ho', 'she_site'
    ].includes(r)
  )
}

// ================================================
// GET: monitoring cuti + tiket
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
    const bulan = searchParams.get('bulan') || String(new Date().getMonth() + 1).padStart(2, '0')
    const tahun = searchParams.get('tahun') || String(new Date().getFullYear())
    const site = searchParams.get('site') || ''
    const statusTiket = searchParams.get('status_tiket') || ''
    const jenisCuti = searchParams.get('jenis_cuti') || ''

    const firstDay = `${tahun}-${bulan}-01`
    const lastDay = `${tahun}-${bulan}-31`

    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isSuperAdmin = session.is_super_admin || false
    const isHOScope = isSuperAdmin || rolesLower.some((r: string) =>
      ['hr_ho', 'hrga', 'hrga_pusat', 'admin',
       'director_ops', 'manager_ops', 'business_dev', 'spv_she_ho'].includes(r)
    )
    const userSite = session.scope_site || session.site || ''

    // ═══════════════════════════════
    // 1. Ambil data cuti
    // ═══════════════════════════════
    let cutiQuery = supabase
      .from('leave_requests')
      .select('*')
      .gte('tanggal_mulai', firstDay)
      .lte('tanggal_mulai', lastDay)
      .order('tanggal_mulai', { ascending: false })

    if (jenisCuti) cutiQuery = cutiQuery.eq('jenis_cuti', jenisCuti)

    const { data: cutiRaw } = await cutiQuery

    // Enrich karyawan
    const cutiNrps = Array.from(new Set((cutiRaw || []).map((c: any) => String(c.nrp))))
    const empMap = new Map<string, any>()
    if (cutiNrps.length > 0) {
      const { data: emps } = await supabase
        .from('employees')
        .select('nrp, nama, jabatan, departemen, site')
        .in('nrp', cutiNrps)
      ;(emps || []).forEach((e: any) => empMap.set(String(e.nrp), e))
    }

    let cutiRows = (cutiRaw || []).map((c: any) => {
      const emp = empMap.get(String(c.nrp))
      return {
        id: c.id,
        nrp: c.nrp,
        nama: emp?.nama || c.nrp,
        jabatan: emp?.jabatan || '-',
        departemen: emp?.departemen || '-',
        site: emp?.site || '-',
        tanggal_mulai: c.tanggal_mulai,
        tanggal_selesai: c.tanggal_selesai,
        jumlah_hari: c.jumlah_hari,
        jenis_cuti: c.jenis_cuti,
        alasan: c.alasan,
        status_atasan: c.status_atasan,
        status_pjo: c.status_pjo,
        status_final: c.status_final,
        butuh_tiket: !!c.butuh_tiket
      }
    })

    // Filter by site
    if (!isHOScope) {
      cutiRows = cutiRows.filter((c: any) => c.site === userSite)
    }
    if (site) cutiRows = cutiRows.filter((c: any) => c.site === site)

    // ═══════════════════════════════
    // 2. Ambil data tiket
    // ═══════════════════════════════
    const cutiIds = cutiRows.map((c: any) => c.id)

    let tiketRows: any[] = []
    if (cutiIds.length > 0) {
      let tiketQuery = supabase
        .from('leave_tickets')
        .select('*')
        .in('leave_request_id', cutiIds)
        .order('tanggal', { ascending: true })

      if (statusTiket) tiketQuery = tiketQuery.eq('status', statusTiket)

      const { data: tiketRaw } = await tiketQuery

      tiketRows = (tiketRaw || []).map((t: any) => {
        const emp = empMap.get(String(t.nrp))
        return {
          id: t.id,
          leave_request_id: t.leave_request_id,
          nrp: t.nrp,
          nama: emp?.nama || t.nrp,
          jabatan: emp?.jabatan || '-',
          site: t.site || emp?.site || '-',
          trip_type: t.trip_type,
          tanggal: t.tanggal,
          tujuan: t.tujuan,
          status: t.status,
          catatan: t.catatan,
          dipesan_oleh: t.dipesan_oleh,
          tanggal_pesan: t.tanggal_pesan
        }
      })
    }

    // ═══════════════════════════════
    // 3. Statistik
    // ═══════════════════════════════
    const stats = {
      total_cuti: cutiRows.length,
      cuti_reguler: cutiRows.filter((c: any) => c.jenis_cuti?.includes('REGULER')).length,
      cuti_tahunan: cutiRows.filter((c: any) => c.jenis_cuti?.includes('TAHUNAN')).length,
      butuh_tiket: cutiRows.filter((c: any) => c.butuh_tiket).length,
      total_tiket: tiketRows.length,
      tiket_menunggu: tiketRows.filter((t: any) => t.status === 'MENUNGGU_PEMESANAN').length,
      tiket_dipesan: tiketRows.filter((t: any) => t.status === 'SUDAH_DIPESAN').length,
      tiket_terkirim: tiketRows.filter((t: any) => t.status === 'E_TICKET_TERKIRIM').length,
      tiket_selesai: tiketRows.filter((t: any) => t.status === 'SELESAI').length
    }

    // ═══════════════════════════════
    // 4. Sites untuk filter
    // ═══════════════════════════════
    const { data: sitesList } = await supabase
      .from('sites_config')
      .select('nama_site')
      .eq('is_active', true)
      .order('nama_site')

    return NextResponse.json({
      cuti: cutiRows,
      tiket: tiketRows,
      stats,
      sites: (sitesList || []).map((s: any) => s.nama_site),
      bulan,
      tahun,
      periode: `${bulan}/${tahun}`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ================================================
// POST: update status tiket
// ================================================
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canView(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { ticket_id, status, catatan } = body

    const validStatus = ['MENUNGGU_PEMESANAN', 'SUDAH_DIPESAN', 'E_TICKET_TERKIRIM', 'SELESAI', 'DIBATALKAN']
    if (!ticket_id || !validStatus.includes(status)) {
      return NextResponse.json({ error: 'ticket_id & status wajib diisi dengan benar' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updates: any = {
      status,
      updated_at: now,
      catatan: catatan || null
    }

    // Kalau status berubah dari MENUNGGU → SUDAH_DIPESAN, catat siapa yang pesan
    if (status === 'SUDAH_DIPESAN') {
      updates.dipesan_oleh = session.nrp
      updates.tanggal_pesan = now
    }

    const { data: updated, error } = await supabase
      .from('leave_tickets')
      .update(updates)
      .eq('id', ticket_id)
      .select()
      .single()

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
      target_type: 'leave_ticket',
      target_id: ticket_id,
      target_label: `Update Status Tiket ${updated.trip_type} → ${status}`,
      status: 'SUCCESS',
      detail: { ticket_id, status, catatan }
    })

    return NextResponse.json({
      success: true,
      message: `Status tiket berhasil diupdate ke ${status}`,
      data: updated
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}