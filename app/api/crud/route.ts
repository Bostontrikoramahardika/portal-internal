import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

const ALLOWED_TABLES = [
  'employees', 'kpi', 'apd', 'pkwt', 'sp', 'roster', 
  'attendance', 'roles', 'approval_matrix', 'announcements',
  'bpjs', 'mcu', 'simper'
]

function cleanData(obj: any) {
  const cleaned = { ...obj }
  for (const key in cleaned) {
    if (cleaned[key] === "") cleaned[key] = null
  }
  return cleaned
}

async function checkAccess(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null
  return await getSession(token)
}

// 1. TAMBAH DATA (POST)
export async function POST(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { table, values } = await req.json()
    if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Tabel tidak diizinkan' }, { status: 400 })

    const dataToSave = cleanData({ ...values })
    if (table === 'announcements') dataToSave.created_by = session.nrp

    const { data, error } = await supabase.from(table).insert(dataToSave).select()
    if (error) throw error
    return NextResponse.json({ data: data[0], message: 'Data berhasil ditambah' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 2. UPDATE DATA (PUT)
export async function PUT(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { table, id, values } = await req.json()
    if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Tabel tidak diizinkan' }, { status: 400 })

    const dataToUpdate = cleanData({ ...values })
    const { data, error } = await supabase.from(table).update(dataToUpdate).eq('id', id).select()
    if (error) throw error
    return NextResponse.json({ data: data[0], message: 'Data berhasil diupdate' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 3. HAPUS SATUAN (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table') || ''
    const id = searchParams.get('id') || ''
    if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Tabel tidak diizinkan' }, { status: 400 })

    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Data berhasil dihapus' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 4. HAPUS MASSAL (PATCH) - Solusi Error 405
export async function PATCH(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { table, ids, action } = await req.json()
    
    if (action === 'bulk_delete' && ALLOWED_TABLES.includes(table)) {
      const { error } = await supabase.from(table).delete().in('id', ids)
      if (error) throw error
      return NextResponse.json({ message: `${ids.length} data berhasil dihapus` })
    }
    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}