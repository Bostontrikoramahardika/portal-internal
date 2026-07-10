import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    const body = await request.json()
    const { table, ids, action, catatan } = body

    // Validasi Input
    if (!table || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
    }

    if (action === 'REJECTED' && !catatan?.trim()) {
      return NextResponse.json({ error: 'Catatan wajib diisi untuk reject' }, { status: 400 })
    }

    const validTables = ['leave_requests', 'overtime_requests', 'attendance_evidences']
    if (!validTables.includes(table)) {
      return NextResponse.json({ error: 'Tabel tidak valid' }, { status: 400 })
    }

    // Statistik hasil
    let success = 0
    let failed = 0
    const errors: string[] = []

    // Loop tiap ID → panggil logika approval yang sesuai
    for (const id of ids) {
      try {
        const result = await processApproval(table, id, action, catatan, session)
        if (result.success) success++
        else { failed++; errors.push(`ID ${id.slice(0,8)}: ${result.error}`) }
      } catch (err: any) {
        failed++
        errors.push(`ID ${id.slice(0,8)}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `✅ Berhasil: ${success} | ❌ Gagal: ${failed}`,
      total: ids.length,
      success_count: success,
      failed_count: failed,
      errors: errors.slice(0, 5) // Max 5 error message
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ==========================================
// PROCESS APPROVAL PER-ITEM (Reusable Logic)
// ==========================================
async function processApproval(table: string, id: string, action: string, catatan: string, session: any) {
  const now = new Date().toISOString()
  const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
  const isAtasan = rolesLower.includes('atasan') || rolesLower.includes('hrga')
  const isPjo = rolesLower.includes('pjo') || rolesLower.includes('hrga')

  // Fetch data
  const { data: item } = await supabase.from(table).select('*').eq('id', id).single()
  if (!item) return { success: false, error: 'Data tidak ditemukan' }

  // ============ ATTENDANCE EVIDENCES (Sakit) - 1 Tahap ============
  if (table === 'attendance_evidences') {
    if (item.status_atasan !== 'PENDING') return { success: false, error: 'Status bukan PENDING' }
    if (item.atasan_nrp !== session.nrp && !rolesLower.includes('hrga')) {
      return { success: false, error: 'Bukan atasan yang berhak' }
    }

    const { error } = await supabase.from('attendance_evidences').update({
      status_atasan: action,
      catatan_atasan: catatan || (action === 'APPROVED' ? 'Disetujui' : 'Ditolak')
    }).eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // ============ LEAVE / OVERTIME - 2 Tahap ============
  // TAHAP ATASAN
  if (item.status_atasan === 'PENDING' && (item.atasan_nrp === session.nrp || rolesLower.includes('hrga'))) {
    if (!isAtasan) return { success: false, error: 'Bukan atasan yang berhak' }

    const updates: any = {
      catatan_atasan: catatan || null,
      tanggal_approval_atasan: now,
      updated_at: now
    }

    if (action === 'APPROVED') {
      updates.status_atasan = 'APPROVED'
      updates.status_pjo = 'PENDING'
      updates.status_final = 'MENUNGGU_PJO'
    } else {
      updates.status_atasan = 'REJECTED'
      updates.status_final = 'DITOLAK_ATASAN'
    }

    const { error } = await supabase.from(table).update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }

    // Log jika leave_requests
    if (table === 'leave_requests') {
      await supabase.from('approval_logs').insert({
        leave_request_id: id, approver_nrp: session.nrp, stage: 'ATASAN', action, catatan: catatan || null
      })
    }
    return { success: true }
  }

  // TAHAP PJO
  if (item.status_atasan === 'APPROVED' && item.status_pjo === 'PENDING' && 
      (item.pjo_nrp === session.nrp || rolesLower.includes('hrga'))) {
    if (!isPjo) return { success: false, error: 'Bukan PJO yang berhak' }

    const updates: any = {
      catatan_pjo: catatan || null,
      tanggal_approval_pjo: now,
      updated_at: now
    }

    if (action === 'APPROVED') {
      updates.status_pjo = 'APPROVED'
      updates.status_final = 'DISETUJUI'
    } else {
      updates.status_pjo = 'REJECTED'
      updates.status_final = 'DITOLAK_PJO'
    }

    const { error } = await supabase.from(table).update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }

    if (table === 'leave_requests') {
      await supabase.from('approval_logs').insert({
        leave_request_id: id, approver_nrp: session.nrp, stage: 'PJO', action, catatan: catatan || null
      })
    }
    return { success: true }
  }

  return { success: false, error: 'Status tidak sesuai untuk diproses' }
}