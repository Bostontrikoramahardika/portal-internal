import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('site, departemen')
    .eq('nrp', session.nrp)
    .single()

  let query = supabase.from('roster_files').select('*').order('periode', { ascending: false })

  if (!session.roles.includes('hrga') && !session.roles.includes('admin')) {
    if (emp?.site) {
      query = query.or(`site.eq.${emp.site},site.is.null`)
    }
  }

  const { data, error } = await query.limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    files: data || [],
    total: (data || []).length
  })
}