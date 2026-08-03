import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getSession } from '@/app/lib/auth'

// ══════════════════════════════════════════════
// PUT /api/events/[id]/mom/[momId] — update item
// ══════════════════════════════════════════════
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; momId: string } }
) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const body = await request.json()
  const { topik, action_item, disampaikan_oleh, due_date, pic, status, catatan } = body

  if (!topik?.trim()) {
    return NextResponse.json({ error: 'Topik wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_mom')
    .update({
      topik: topik.trim(),
      action_item: action_item?.trim() || null,
      disampaikan_oleh: disampaikan_oleh?.trim() || null,
      due_date: due_date || null,
      pic: pic?.trim() || null,
      status: status || 'OPEN',
      catatan: catatan?.trim() || null,
    })
    .eq('id', params.momId)
    .eq('event_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mom: data })
}

// ══════════════════════════════════════════════
// DELETE /api/events/[id]/mom/[momId] — hapus item
// ══════════════════════════════════════════════
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; momId: string } }
) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('event_mom')
    .delete()
    .eq('id', params.momId)
    .eq('event_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}