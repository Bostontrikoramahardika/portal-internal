import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  // ✅ v2.0: Support cookie DAN Authorization header (untuk iPhone PWA)
  let token = request.cookies.get('session_token')?.value

  // Kalau tidak ada cookie → coba dari Authorization header
  if (!token) {
    const authHeader = request.headers.get('authorization') || ''
    token = authHeader.replace(/^Bearer\s+/i, '').trim() || undefined
  }

  if (!token) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  const session = await getSession(token)

  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, is_super_admin')
    .eq('nrp', session.nrp)
    .single()

  if (!emp) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const response = NextResponse.json({
    user: {
      ...emp,
      is_super_admin: Boolean(emp?.is_super_admin)
    },
    roles: session.roles,
    is_super_admin: Boolean(emp?.is_super_admin),
    permissions: session.permissions || []
  })

  response.headers.set(
    'Cache-Control',
    'private, max-age=30, stale-while-revalidate=120'
  )

  return response
}