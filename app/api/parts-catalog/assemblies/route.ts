import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const unit_id = searchParams.get('unit_id')
  if (!unit_id) return NextResponse.json({ error: 'unit_id wajib' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('parts_assemblies')
    .select('id, unit_id, sheet_name, assembly_name, unit_header, image_drive_web_view_link, sort_order, created_at')
    .eq('unit_id', unit_id)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}