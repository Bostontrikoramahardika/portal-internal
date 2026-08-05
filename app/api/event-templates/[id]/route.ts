// app/api/event-templates/[id]/route.ts
// PUT    → Update template
// DELETE → Soft delete (set active=false)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

function canManage(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    ['she_site', 'spv_she_ho', 'pjo_site', 'pjo',
     'hr_ho', 'hrga', 'hrga_pusat', 'hr_site', 'hrga_site',
     'admin', 'admin_site', 'admin_plant',
     'gl_produksi', 'gl_plant',
     'director_ops', 'manager_ops', 'business_dev'].includes(r)
  )
}

// ═══ PUT — Update template ═══
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const updateData: any = {}
    const allowedFields = [
      'nama', 'deskripsi', 'tipe', 'recurring_days',
      'default_jam_mulai', 'default_jam_selesai', 'default_lokasi',
      'default_site', 'default_qr_location_id', 'reminder_h_minus', 'active'
    ]
    for (const f of allowedFields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    const { data, error } = await supabase
      .from('event_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: '✅ Template diperbarui',
      data
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══ DELETE — Soft delete ═══
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('event_templates')
      .update({ active: false })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: '🗑️ Template dinonaktifkan (event yang sudah di-generate tidak dihapus)'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}