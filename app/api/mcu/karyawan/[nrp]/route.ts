// app/api/mcu/karyawan/[nrp]/route.ts
// Timeline MCU + Findings + Stats per karyawan
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

export async function GET(req: NextRequest, { params }: { params: Promise<{ nrp: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const { nrp } = await params
  if (!nrp) return NextResponse.json({ error: 'NRP wajib' }, { status: 400 })

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  // ── STEP 1: Info karyawan ──
  const { data: emp, error: empErr } = await supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, status_karyawan, tanggal_masuk, foto_url')
    .eq('nrp', nrp)
    .single()

  if (empErr || !emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

  // Scope role check
  const HO_ROLES = ['super_admin', 'hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho']
  const isHO = isSuperAdmin || HO_ROLES.includes(role)
  const isSameSite = emp.site === session.site
  const isSelf = emp.nrp === session.nrp

  if (!isHO && !isSameSite && !isSelf) {
    return NextResponse.json({ error: 'Tidak punya akses ke karyawan ini' }, { status: 403 })
  }

  // ── STEP 2: Semua MCU karyawan (urut terbaru dulu) ──
  const { data: mcus, error: mcuErr } = await supabaseAdmin
    .from('mcu')
    .select(`
      id, nrp, tanggal_mcu, jenis_mcu, hasil,
      dokter, rumah_sakit, tanggal_berlaku, tanggal_expired,
      foto_catatan_url, foto_catatan_name, gdrive_folder_id,
      catatan_hrga, keterangan, temuan_summary, status_mcu,
      butuh_followup, followup_deadline,
      uploaded_by, uploaded_at, updated_by, updated_at, created_at
    `)
    .eq('nrp', nrp)
    .order('tanggal_mcu', { ascending: false })

  if (mcuErr) return NextResponse.json({ error: mcuErr.message }, { status: 500 })

  const mcuList = mcus || []
  const mcuIds = mcuList.map(m => m.id)

  // ── STEP 3: Semua findings untuk MCU ini ──
  let findings: any[] = []
  if (mcuIds.length > 0) {
    const { data: findingsData } = await supabaseAdmin
      .from('mcu_findings')
      .select(`
        id, mcu_id, jenis_temuan, keterangan_temuan, status_followup,
        followup_file_url, followup_file_name, followup_keterangan,
        followup_submitted_at, verified_by, verified_at, verified_status, verified_note,
        created_at
      `)
      .in('mcu_id', mcuIds)
      .order('created_at', { ascending: true })

    findings = findingsData || []
  }

  // Map findings per mcu
  const findingsByMcu: Record<string, any[]> = {}
  findings.forEach(f => {
    if (!findingsByMcu[f.mcu_id]) findingsByMcu[f.mcu_id] = []
    findingsByMcu[f.mcu_id].push(f)
  })

  // Enrich mcus dengan findings
  const timeline = mcuList.map((m, idx) => ({
    ...m,
    mcu_number: mcuList.length - idx, // MCU ke-berapa (chronological)
    findings: findingsByMcu[m.id] || [],
    findings_count: (findingsByMcu[m.id] || []).length,
    pending_fu_count: (findingsByMcu[m.id] || []).filter(f => f.status_followup === 'BELUM_FU').length,
    waiting_verify_count: (findingsByMcu[m.id] || []).filter(f => f.status_followup === 'SUDAH_FU').length,
    completed_fu_count: (findingsByMcu[m.id] || []).filter(f => f.status_followup === 'SELESAI').length,
  }))

  // ── STEP 4: Statistik ringkas ──
  const today = getWitaToday()
  const activeMcu = timeline.find(m => m.tanggal_expired && m.tanggal_expired >= today)
  const totalFindings = findings.length
  const activeFindings = findings.filter(f => ['BELUM_FU', 'SUDAH_FU'].includes(f.status_followup)).length

  const stats = {
    total_mcu: timeline.length,
    active_mcu: activeMcu || null,
    mcu_expired_at: activeMcu?.tanggal_expired || null,
    is_expired: !activeMcu,
    total_findings: totalFindings,
    active_findings: activeFindings,
    pending_fu: findings.filter(f => f.status_followup === 'BELUM_FU').length,
    waiting_verify: findings.filter(f => f.status_followup === 'SUDAH_FU').length,
    completed_fu: findings.filter(f => f.status_followup === 'SELESAI').length,
    rejected_fu: findings.filter(f => f.status_followup === 'DITOLAK').length,
  }

  // ── STEP 5: Aggregate temuan by jenis (untuk chart/summary) ──
  const findingsByJenis: Record<string, number> = {}
  findings.forEach(f => {
    findingsByJenis[f.jenis_temuan] = (findingsByJenis[f.jenis_temuan] || 0) + 1
  })

  return NextResponse.json({
    ok: true,
    employee: emp,
    stats,
    timeline,
    findings_summary: Object.entries(findingsByJenis)
      .map(([jenis, count]) => ({ jenis, count }))
      .sort((a, b) => b.count - a.count),
  })
}