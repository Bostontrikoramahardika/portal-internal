import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const { data: asm, error: asmErr } = await supabaseAdmin
    .from('parts_assemblies')
    .select('id, unit_id, sheet_name, assembly_name, unit_header, image_drive_file_id, image_drive_web_view_link, sort_order')
    .eq('id', id)
    .single()

  if (asmErr) return NextResponse.json({ error: asmErr.message }, { status: 500 })

  const { data: items, error: itemErr } = await supabaseAdmin
    .from('parts_items')
    .select('id, ref_no, part_number, part_name, qty, serial_no')
    .eq('assembly_id', id)
    .order('ref_no', { ascending: true })

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

  return NextResponse.json({ success: true, assembly: asm, items: items || [] })
}