import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getSession } from '@/app/lib/auth'

// ══════════════════════════════════════════════
// GET /api/events/[id]/mom — list MoM
// ══════════════════════════════════════════════
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('event_mom')
    .select('*')
    .eq('event_id', params.id)
    .order('no_urut', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mom: data || [] })
}

// ══════════════════════════════════════════════
// POST /api/events/[id]/mom — tambah item MoM
// ══════════════════════════════════════════════
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

  // Auto no_urut: ambil max no_urut event ini + 1
  const { data: existing } = await supabaseAdmin
    .from('event_mom')
    .select('no_urut')
    .eq('event_id', params.id)
    .order('no_urut', { ascending: false })
    .limit(1)

  const nextNo = existing && existing.length > 0 ? (existing[0].no_urut + 1) : 1

  const { data, error } = await supabaseAdmin
    .from('event_mom')
    .insert({
      event_id: params.id,
      no_urut: nextNo,
      topik: topik.trim(),
      action_item: action_item?.trim() || null,
      disampaikan_oleh: disampaikan_oleh?.trim() || null,
      due_date: due_date || null,
      pic: pic?.trim() || null,
      status: status || 'OPEN',
      catatan: catatan?.trim() || null,
      created_by: session.nrp,
      created_by_nama: session.nama,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mom: data }, { status: 201 })
}