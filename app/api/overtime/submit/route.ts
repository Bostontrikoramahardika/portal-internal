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
    const { tanggal, jam_mulai, jam_selesai, alasan, jenis_lembur, atasan_nrp } = body

    // Validasi
    if (!tanggal || !jam_mulai || !jam_selesai || !alasan || !atasan_nrp) {
      return NextResponse.json({ error: 'Semua field wajib diisi (termasuk atasan)' }, { status: 400 })
    }

    // Validasi atasan_nrp
    const { data: atasanCheck } = await supabase
      .from('employees')
      .select('nrp, nama')
      .eq('nrp', atasan_nrp)
      .single()

    if (!atasanCheck) {
      return NextResponse.json({ error: 'Atasan yang dipilih tidak ditemukan' }, { status: 400 })
    }

    // Hitung total jam
    const [startH, startM] = jam_mulai.split(':').map(Number)
    const [endH, endM] = jam_selesai.split(':').map(Number)

    let totalMenit = (endH * 60 + endM) - (startH * 60 + startM)
    if (totalMenit < 0) totalMenit += 1440 // kalau lewat tengah malam

    const totalJam = Math.round((totalMenit / 60) * 100) / 100

    if (totalJam <= 0) {
      return NextResponse.json({ error: 'Jam selesai harus lebih besar dari jam mulai' }, { status: 400 })
    }

    // Insert overtime request
    const { data: newOvertime, error: insertError } = await supabase
      .from('overtime_requests')
      .insert({
        nrp: session.nrp,
        tanggal,
        jam_mulai,
        jam_selesai,
        total_jam: totalJam,
        alasan,
        jenis_lembur: jenis_lembur || 'BIASA',
        atasan_nrp,
        status_atasan: 'PENDING',
        status_final: 'MENUNGGU_ATASAN'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `✅ Pengajuan lembur ${totalJam} jam berhasil dibuat. Menunggu approval atasan (${atasanCheck.nama}).`,
      data: newOvertime
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}