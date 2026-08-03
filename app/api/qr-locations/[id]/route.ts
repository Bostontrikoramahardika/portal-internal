// app/api/qr-locations/[id]/route.ts
// DELETE → Nonaktifkan QR Lokasi

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { id } = await params

    const { data: loc } = await supabase
      .from('qr_locations')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!loc) return NextResponse.json({ error: 'QR Lokasi tidak ditemukan' }, { status: 404 })

    if (loc.created_by !== session.nrp && !session.is_super_admin) {
      return NextResponse.json({ error: 'Hanya pembuat yang bisa nonaktifkan' }, { status: 403 })
    }

    const { error } = await supabase
      .from('qr_locations')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: '✅ QR Lokasi dinonaktifkan' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}