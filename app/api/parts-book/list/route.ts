import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  // Auth guard — semua user login bisa akses
  const auth = await requireAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const unit_name = searchParams.get('unit_name')
    const doc_type  = searchParams.get('doc_type')
    const search    = searchParams.get('search')

    let query = supabaseAdmin
      .from('parts_book')
      .select('*')
      .eq('is_active', true)
      .order('unit_name', { ascending: true })
      .order('created_at', { ascending: false })

    if (unit_name) {
      query = query.ilike('unit_name', `%${unit_name}%`)
    }

    if (doc_type) {
      query = query.eq('doc_type', doc_type)
    }

    if (search) {
      query = query.or(
        `unit_name.ilike.%${search}%,drive_file_name.ilike.%${search}%,notes.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('DB Error:', error)
      return NextResponse.json(
        { error: 'Gagal ambil data', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      total: data?.length ?? 0,
      data: data ?? [],
    })

  } catch (err: any) {
    console.error('List error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    )
  }
}