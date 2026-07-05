export const dynamic = 'force-dynamic'; // Tambahkan ini

import { supabase } from '@/lib/supabase'; // contoh import kamu
// ... sisa kode lainnya

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '../../lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: cek role
async function getUserRole(nrp: string): Promise<string[]> {
  const { data } = await supabase
    .from('roles')
    .select('role')
    .eq('nrp', nrp)
    .eq('active', true)
  return data?.map((r: any) => r.role) || []
}

// Helper: enrich dengan nama karyawan
async function enrichNama(nrpList: string[]): Promise<Record<string, string>> {
  if (nrpList.length === 0) return {}
  const { data } = await supabase
    .from('employees')
    .select('nrp, nama')
    .in('nrp', nrpList)
  const map: Record<string, string> = {}
  data?.forEach((e: any) => { map[e.nrp] = e.nama })
  return map
}

// ==================== GET ====================
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table') // 'bpjs' | 'mcu' | 'simper'
  const nrp = searchParams.get('nrp') // filter by NRP (optional)
  const id = searchParams.get('id') // get by ID (optional)
  const checkExpired = searchParams.get('check_expired') === 'true'

  if (!table || !['bpjs', 'mcu', 'simper'].includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  try {
    let query = supabase.from(table).select('*').order('created_at', { ascending: false })

    if (id) query = query.eq('id', id).single()
    if (nrp) query = query.eq('nrp', nrp)

    const { data, error } = await query
    if (error) throw error

    // Enrich dengan nama karyawan
    if (data && Array.isArray(data) && data.length > 0) {
      const nrps = [...new Set(data.map((d: any) => d.nrp).filter(Boolean))]
      const namaMap = await enrichNama(nrps)
      data.forEach((d: any) => { d._nama_karyawan = namaMap[d.nrp] || d.nama_karyawan || d.nrp })
    } else if (data && !Array.isArray(data)) {
      const namaMap = await enrichNama([data.nrp].filter(Boolean))
      data._nama_karyawan = namaMap[data.nrp] || data.nama_karyawan || data.nrp
    }

    // Special: untuk MCU, hitung notifikasi expired
    if (table === 'mcu' && checkExpired && Array.isArray(data)) {
      const now = new Date()
      data.forEach((m: any) => {
        if (m.tanggal_expired) {
          const exp = new Date(m.tanggal_expired)
          const daysLeft = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          m._days_until_expired = daysLeft
          m._is_expired = daysLeft < 0
          m._is_expiring_soon = daysLeft >= 0 && daysLeft <= 30
        }
      })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ==================== POST ====================
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = await getUserRole(session.nrp)
  if (!roles.includes('hrga')) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa menambah data' }, { status: 403 })
  }

  const body = await req.json()
  const { table, data } = body

  if (!table || !['bpjs', 'mcu', 'simper'].includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  try {
    // Auto-fill nama_karyawan
    if (data.nrp && !data.nama_karyawan) {
      const namaMap = await enrichNama([data.nrp])
      data.nama_karyawan = namaMap[data.nrp] || null
    }

    const { data: inserted, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data: inserted, message: 'Data berhasil ditambah' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ==================== PUT ====================
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = await getUserRole(session.nrp)
  if (!roles.includes('hrga')) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa edit data' }, { status: 403 })
  }

  const body = await req.json()
  const { table, id, data } = body

  if (!table || !['bpjs', 'mcu', 'simper'].includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    if (data.nrp && !data.nama_karyawan) {
      const namaMap = await enrichNama([data.nrp])
      data.nama_karyawan = namaMap[data.nrp] || null
    }
    data.updated_at = new Date().toISOString()

    const { data: updated, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data: updated, message: 'Data berhasil diupdate' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ==================== DELETE ====================
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = await getUserRole(session.nrp)
  if (!roles.includes('hrga')) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa hapus data' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')
  const id = searchParams.get('id')

  if (!table || !['bpjs', 'mcu', 'simper'].includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Data berhasil dihapus' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}