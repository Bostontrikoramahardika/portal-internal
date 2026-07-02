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
    const { tanggal_mulai, tanggal_selesai, jenis_cuti, alasan } = body

    // Validasi input
    if (!tanggal_mulai || !tanggal_selesai || !jenis_cuti || !alasan) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
    }

    const start = new Date(tanggal_mulai + 'T00:00:00')
    const end = new Date(tanggal_selesai + 'T00:00:00')

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
    }

    if (end < start) {
      return NextResponse.json({ error: 'Tanggal selesai tidak boleh lebih kecil dari tanggal mulai' }, { status: 400 })
    }

    const jumlahHari = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1

    // Cek approval matrix
    const { data: matrix } = await supabase
      .from('approval_matrix')
      .select('*')
      .eq('employee_nrp', session.nrp)
      .eq('active', true)
      .single()

    if (!matrix) {
      return NextResponse.json({
        error: 'Approval matrix untuk Anda belum diatur. Hubungi HRGA.'
      }, { status: 400 })
    }

    // Cek overlap dengan cuti yang sudah ada
    const { data: existing } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('nrp', session.nrp)
      .in('status_final', ['MENUNGGU_ATASAN', 'MENUNGGU_PJO', 'DISETUJUI'])

    const overlap = (existing || []).some((r: any) => {
      const s = new Date(r.tanggal_mulai + 'T00:00:00')
      const e = new Date(r.tanggal_selesai + 'T00:00:00')
      return start <= e && s <= end
    })

    if (overlap) {
      return NextResponse.json({
        error: 'Tanggal bentrok dengan cuti Anda yang lain'
      }, { status: 400 })
    }

    // Insert leave request
    const { data: newLeave, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        nrp: session.nrp,
        tanggal_mulai,
        tanggal_selesai,
        jumlah_hari: jumlahHari,
        jenis_cuti,
        alasan,
        atasan_nrp: matrix.atasan_nrp,
        pjo_nrp: matrix.pjo_nrp,
        status_atasan: 'PENDING',
        status_pjo: 'WAITING',
        status_final: 'MENUNGGU_ATASAN'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log ke approval_logs
    await supabase.from('approval_logs').insert({
      leave_request_id: newLeave.id,
      approver_nrp: session.nrp,
      stage: 'SUBMITTED',
      action: 'SUBMITTED',
      catatan: alasan
    })

    return NextResponse.json({
      success: true,
      message: `Pengajuan cuti berhasil dibuat. ${jumlahHari} hari cuti menunggu approval atasan.`,
      data: newLeave
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}