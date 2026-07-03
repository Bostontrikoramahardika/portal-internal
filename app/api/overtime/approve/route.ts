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
    const { overtime_id, action, catatan } = body

    if (!overtime_id || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Data approval tidak valid' }, { status: 400 })
    }

    if (action === 'REJECTED' && !catatan?.trim()) {
      return NextResponse.json({ error: 'Catatan wajib diisi jika reject' }, { status: 400 })
    }

    // Get overtime data
    const { data: overtime } = await supabase
      .from('overtime_requests')
      .select('*')
      .eq('id', overtime_id)
      .single()

    if (!overtime) {
      return NextResponse.json({ error: 'Data lembur tidak ditemukan' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const isAtasan = session.roles.includes('atasan') || session.roles.includes('hrga')

    // Cek hak akses
    if (!isAtasan) {
      return NextResponse.json({ error: 'Anda tidak berhak approve lembur' }, { status: 403 })
    }

    if (overtime.atasan_nrp !== session.nrp && !session.roles.includes('hrga')) {
      return NextResponse.json({ error: 'Anda bukan atasan yang dipilih untuk lembur ini' }, { status: 403 })
    }

    if (overtime.status_atasan !== 'PENDING') {
      return NextResponse.json({ error: 'Lembur ini sudah diproses sebelumnya' }, { status: 400 })
    }

    const updates: any = {
      catatan_atasan: catatan || null,
      tanggal_approval_atasan: now,
      updated_at: now
    }

    if (action === 'APPROVED') {
      updates.status_atasan = 'APPROVED'
      updates.status_final = 'DISETUJUI'
    } else {
      updates.status_atasan = 'REJECTED'
      updates.status_final = 'DITOLAK'
    }

    const { error } = await supabase
      .from('overtime_requests')
      .update(updates)
      .eq('id', overtime_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: action === 'APPROVED'
        ? '✅ Lembur disetujui.'
        : '❌ Lembur ditolak.'
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}