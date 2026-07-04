import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  
  if (!token) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  const session = await getSession(token)
  
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site')
    .eq('nrp', session.nrp)
    .single()

  if (!emp) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    user: emp,
    roles: session.roles
  })
}