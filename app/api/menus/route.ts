import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { data: menus, error } = await supabase
    .from('menus')
    .select('*')
    .in('role', session.roles)
    .eq('active', true)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduplikasi menu berdasarkan menu_key
  // Kalau ada menu yang sama di 2 role, ambil yang sort_order lebih kecil
  const uniqueMenus = new Map()
  ;(menus || []).forEach((m: any) => {
    if (!uniqueMenus.has(m.menu_key)) {
      uniqueMenus.set(m.menu_key, m)
    }
  })

  const deduplicated = Array.from(uniqueMenus.values())
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  return NextResponse.json({ menus: deduplicated })
}