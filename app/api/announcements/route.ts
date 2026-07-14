import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getSession } from '@/app/lib/auth'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Hanya ambil 1 pengumuman terakhir yang ACTIVE
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(20) // Ambil agak banyak dulu untuk di-filter manual di bawah

    if (error) {
      console.error('Announcements error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter manual: expires_at harus null ATAU >= hari ini
    const validData = (data || []).filter((a: any) => {
      if (!a.expires_at) return true
      return new Date(a.expires_at) >= new Date(today)
    })

    // Return item pertama yang valid
    return NextResponse.json({ announcement: validData[0] || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
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

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session?.is_super_admin) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: '✅ Pengumuman dihapus' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}