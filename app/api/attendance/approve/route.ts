import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// WAJIB: Nama fungsi harus POST (Caps Lock)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const body = await request.json()
    const { id, action, catatan } = body // ID adalah UUID dari data attendance_evidences

    if (!id || !action) {
      return NextResponse.json({ error: 'ID dan Action wajib diisi' }, { status: 400 })
    }

    // Update tabel attendance_evidences
    const { error: updateError } = await supabase
      .from('attendance_evidences')
      .update({
        status_atasan: action, // APPROVED / REJECTED
        catatan_atasan: catatan || (action === 'APPROVED' ? 'Disetujui' : 'Ditolak'),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Update Error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bukti sakit berhasil di-${action.toLowerCase()}` 
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}