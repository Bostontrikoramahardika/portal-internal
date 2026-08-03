// app/api/master-perusahaan/route.ts
// GET  → List perusahaan
// POST → Tambah perusahaan baru
// DELETE via ?id=xxx → Nonaktifkan

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

function canManage(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    ['she_site', 'spv_she_ho', 'pjo_site', 'pjo',
     'hr_ho', 'hrga', 'hrga_pusat', 'hr_site', 'hrga_site',
     'admin', 'admin_site', 'admin_plant', 'gl_produksi', 'gl_plant',
     'director_ops', 'manager_ops', 'business_dev'].includes(r)
  )
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('master_perusahaan')
      .select('*')
      .eq('active', true)
      .order('is_default', { ascending: false })
      .order('nama_perusahaan')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Anda tidak berhak' }, { status: 403 })
    }

    const body = await request.json()
    const { nama_perusahaan } = body

    if (!nama_perusahaan) {
      return NextResponse.json({ error: 'Nama perusahaan wajib' }, { status: 400 })
    }

    const { data: newP, error } = await supabase
      .from('master_perusahaan')
      .insert({
        nama_perusahaan: String(nama_perusahaan).trim(),
        is_default: false,
        active: true
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Perusahaan sudah ada' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '✅ Perusahaan ditambahkan', data: newP })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Anda tidak berhak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

    // Cek is_default
    const { data: mp } = await supabase
      .from('master_perusahaan')
      .select('is_default')
      .eq('id', id)
      .single()

    if (mp?.is_default) {
      return NextResponse.json({ error: 'Perusahaan default tidak bisa dihapus' }, { status: 400 })
    }

    const { error } = await supabase
      .from('master_perusahaan')
      .update({ active: false })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: '✅ Perusahaan dinonaktifkan' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}