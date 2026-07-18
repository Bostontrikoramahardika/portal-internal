import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

const ADMIN_ROLES = ['super_admin', 'admin_plant', 'gl_plant', 'pjo_site', 'manager_ops', 'director_ops']

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const isAdmin = session.is_super_admin || 
                  session.roles?.some((r: string) => ADMIN_ROLES.includes(r))

  if (!isAdmin) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const body = await req.json()
  const { id, status, catatan_admin } = body

  const validStatus = ['Pending', 'Approved', 'Rejected', 'Available', 'Not Available']
  if (!id || !validStatus.includes(status)) {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('part_orders')
    .update({
      status,
      catatan_admin: catatan_admin || '',
      handled_by: session.nama || session.nrp,
      handled_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, data })
}