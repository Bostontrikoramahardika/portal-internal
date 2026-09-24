import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') || 'all' // 'my' | 'approval' | 'all'
  const status = searchParams.get('status') || ''
  const search = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('purchase_requisitions')
    .select(`
      *,
      pr_items (*),
      warehouses:assigned_warehouse_code (nama_gudang, site_code)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (mode === 'my') {
    query = query.eq('requester_nrp', session.nrp)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (search) {
    query = query.or('pr_number.ilike.%' + search + '%,unit_code.ilike.%' + search + '%,requester_name.ilike.%' + search + '%')
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data || [],
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  })
}