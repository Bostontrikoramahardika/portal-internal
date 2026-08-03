import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const isSuperAdmin = session.is_super_admin || false

  let query = supabase
    .from('menus')
    .select('*')
    .eq('active', true)
    .order('sort_order')

  if (!isSuperAdmin) {
    // Tambah role '*' supaya menu global juga kebawa
    const rolesToQuery = Array.from(new Set([...(session.roles || []), '*']))
    query = query.in('role', rolesToQuery)
  }

  const { data: menus, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

 // Deduplikasi menu berdasarkan menu_key
// Prioritas: role spesifik user > role '*' > role lain
const userRoles = session.roles || []
const uniqueMenus = new Map()

;(menus || []).forEach((m: any) => {
  const existing = uniqueMenus.get(m.menu_key)
  if (!existing) {
    uniqueMenus.set(m.menu_key, m)
    return
  }
  // Prioritaskan role yang match dengan user
  const existingIsUserRole = userRoles.includes(existing.role) || existing.role === 'super_admin'
  const newIsUserRole = userRoles.includes(m.role) || m.role === 'super_admin'
  if (!existingIsUserRole && newIsUserRole) {
    uniqueMenus.set(m.menu_key, m)
  }
})

const deduplicated = Array.from(uniqueMenus.values()).sort(
  (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
)

  const response = NextResponse.json({ menus: deduplicated })

  // Cache di browser 60 detik + stale-while-revalidate 5 menit
  response.headers.set(
    'Cache-Control',
    'private, max-age=60, stale-while-revalidate=300'
  )

  return response
}