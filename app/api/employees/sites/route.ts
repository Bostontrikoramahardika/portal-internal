import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

const SITE_SCOPED_ROLES = ['hr_site', 'pjo_site', 'she_site']

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const session = auth.session

  let query = supabaseAdmin
    .from('employees')
    .select('site')
    .not('site', 'is', null)
    .order('site')

  if (SITE_SCOPED_ROLES.includes(session.role) && session.site) {
    query = query.eq('site', session.site)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sites = Array.from(
    new Set(
      (data || [])
        .map((item: any) => (item.site || '').trim())
        .filter(Boolean)
    )
  )

  return NextResponse.json({
    ok: true,
    data: sites
  })
}
