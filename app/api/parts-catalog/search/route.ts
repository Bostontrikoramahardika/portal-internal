import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const unit_id = (searchParams.get('unit_id') || '').trim()

  if (!q) return NextResponse.json({ success: true, data: [] })

  // join supabase: parts_items -> parts_assemblies
  let query = supabaseAdmin
    .from('parts_items')
    .select('id, ref_no, part_number, part_name, qty, assembly_id, parts_assemblies(assembly_name, unit_id)')
    .or(`part_number.ilike.%${q}%,part_name.ilike.%${q}%`)
    .limit(50)

  if (unit_id) {
    query = query.eq('parts_assemblies.unit_id', unit_id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data: data || [] })
}