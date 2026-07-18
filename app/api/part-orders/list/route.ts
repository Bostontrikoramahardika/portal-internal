import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

// Role yang boleh lihat SEMUA order (admin plant + logistik)
const ADMIN_ROLES = ['super_admin', 'admin_plant', 'gl_plant', 'pjo_site', 'manager_ops', 'director_ops']

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const { searchParams } = new URL(req.url)
  
  const mode = searchParams.get('mode') || 'my'    // 'my' | 'all'
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const isAdmin = session.is_super_admin || 
                  session.roles?.some((r: string) => ADMIN_ROLES.includes(r))

  let query = supabaseAdmin
    .from('part_orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Non-admin atau mode=my → hanya order sendiri
  if (!isAdmin || mode === 'my') {
    query = query.eq('requester_name', session.nama || session.nrp)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ 
    ok: true, 
    data, 
    count, 
    page, 
    limit,
    isAdmin  // biar UI tahu user ini admin/tidak
  })
}