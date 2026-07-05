import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getSession } from '@/app/lib/auth'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ announcement: data?.[0] || null })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session || !session.roles.includes('hrga')) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa membuat pengumuman' }, { status: 403 })
  }

  const body = await req.json()

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      ...body,
      created_by: session.nrp
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, message: 'Pengumuman berhasil dibuat' })
}