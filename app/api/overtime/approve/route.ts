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

    const { data: overtime } = await supabase
      .from('overtime_requests')
      .select('*')
      .eq('id', overtime_id)
      .single()

    if (!overtime) {
      return NextResponse.json({ error: 'Data lembur tidak ditemukan' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isAtasan = rolesLower.some((r: string) =>
      ['gl_produksi', 'gl_plant', 'hr_site', 'atasan', 'hrga'].includes(r)
    )
    const isPjo = rolesLower.some((r: string) =>
      ['pjo_site', 'pjo', 'hrga'].includes(r)
    )

    // TAHAP ATASAN
    if (
      overtime.status_atasan === 'PENDING' &&
      (overtime.atasan_nrp === session.nrp || session.roles.includes('hrga'))
    ) {
      if (!isAtasan) {
        return NextResponse.json({ error: 'Anda bukan atasan yang dipilih' }, { status: 403 })
      }

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

      const { error } = await supabase
        .from('overtime_requests')
        .update(updates)
        .eq('id', overtime_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({
        success: true,
        message: action === 'APPROVED'
          ? '✅ Lembur disetujui atasan. Menunggu approval PJO.'
          : '❌ Lembur ditolak pada tahap atasan.'
      })
    }

    // TAHAP PJO
    if (
      overtime.status_atasan === 'APPROVED' &&
      overtime.status_pjo === 'PENDING' &&
      (overtime.pjo_nrp === session.nrp || session.roles.includes('hrga'))
    ) {
      if (!isPjo) {
        return NextResponse.json({ error: 'Anda bukan PJO yang berhak' }, { status: 403 })
      }

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

      const { error } = await supabase
        .from('overtime_requests')
        .update(updates)
        .eq('id', overtime_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({
        success: true,
        message: action === 'APPROVED'
          ? '🎉 Lembur disetujui final oleh PJO!'
          : '❌ Lembur ditolak pada tahap PJO.'
      })
    }

    return NextResponse.json({
      error: 'Anda tidak berhak memproses approval ini atau status tidak sesuai'
    }, { status: 403 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}