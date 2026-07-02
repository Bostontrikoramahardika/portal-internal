import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// Daftar tabel yang boleh di-CRUD
const ALLOWED_TABLES = [
  'employees', 'roles', 'approval_matrix',
  'kpi', 'apd', 'pkwt', 'sp', 'roster', 'leave_requests', 'menus'
]

// Cek role HRGA
function isHrga(session: any): boolean {
  return session.roles?.includes('hrga') || false
}

// ============================================
// CREATE - Insert data baru
// ============================================
export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!isHrga(session)) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa CRUD' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { table, values } = body

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Tabel tidak diizinkan' }, { status: 400 })
    }

    if (!values || typeof values !== 'object') {
      return NextResponse.json({ error: 'Values wajib diisi' }, { status: 400 })
    }

    // Bersihkan field kosong
    const cleanValues: any = {}
    Object.keys(values).forEach(key => {
      const val = values[key]
      if (val !== '' && val !== null && val !== undefined) {
        cleanValues[key] = val
      }
    })

    const { data, error } = await supabase
      .from(table)
      .insert(cleanValues)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_nrp: session.nrp,
      action: 'CREATE',
      target_table: table,
      target_id: data.id,
      detail: cleanValues
    })

    return NextResponse.json({ success: true, message: '✅ Data berhasil ditambahkan', data })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// UPDATE - Ubah data
// ============================================
export async function PUT(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!isHrga(session)) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa CRUD' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { table, id, values } = body

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Tabel tidak diizinkan' }, { status: 400 })
    }

    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

    // Bersihkan field kosong
    const cleanValues: any = {}
    Object.keys(values).forEach(key => {
      if (key === 'id' || key === 'created_at') return
      const val = values[key]
      if (val !== undefined) {
        cleanValues[key] = val === '' ? null : val
      }
    })

    const { data, error } = await supabase
      .from(table)
      .update(cleanValues)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_nrp: session.nrp,
      action: 'UPDATE',
      target_table: table,
      target_id: id,
      detail: cleanValues
    })

    return NextResponse.json({ success: true, message: '✅ Data berhasil diupdate', data })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// DELETE - Hapus data
// ============================================
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!isHrga(session)) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa CRUD' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const id = searchParams.get('id')

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Tabel tidak diizinkan' }, { status: 400 })
    }

    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_nrp: session.nrp,
      action: 'DELETE',
      target_table: table,
      target_id: id,
      detail: { deleted_by: session.nrp }
    })

    return NextResponse.json({ success: true, message: '✅ Data berhasil dihapus' })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}