// app/api/data-karyawan/route.ts (v2.0 - Fix TypeScript + Support role baru)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/app/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Role yang bisa CRUD data karyawan (BPJS, MCU, SIMPER)
const HR_ROLES = [
  'super_admin', 'hr_ho', 'hr_site',
  // Legacy
  'hrga', 'hrga_oprek', 'hrga_pusat', 'hrga_site', 'admin'
]

// Helper: cek apakah user boleh CRUD
function canManageData(session: any): boolean {
  if (session?.is_super_admin) return true
  return (session?.roles || []).some((r: string) => HR_ROLES.includes(r))
}

// Helper: enrich dengan nama karyawan
async function enrichNama(nrpList: string[]): Promise<Record<string, string>> {
  if (nrpList.length === 0) return {}
  const { data } = await supabase
    .from('employees')
    .select('nrp, nama')
    .in('nrp', nrpList)
  const map: Record<string, string> = {}
  ;(data || []).forEach((e: any) => { map[e.nrp] = e.nama })
  return map
}

// ==================== GET ====================
export async function GET(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')
  const nrp = searchParams.get('nrp')
  const id = searchParams.get('id')
  const checkExpired = searchParams.get('check_expired') === 'true'

  if (!table || !['bpjs', 'mcu', 'simper'].includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  try {
    let query: any = supabase.from(table).select('*').order('created_at', { ascending: false })

    if (id) query = query.eq('id', id).single()
    if (nrp) query = query.eq('nrp', nrp)

    const { data, error } = await query
    if (error) throw error

    // Enrich dengan nama karyawan
    if (data && Array.isArray(data) && data.length > 0) {
      const nrps: string[] = [...new Set(data.map((d: any) => d.nrp).filter(Boolean) as string[])]
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
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!canManageData(session)) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa menambah data' }, { status: 403 })
  }

  const body = await req.json()
  const { table, data } = body

  if (!table || !['bpjs', 'mcu', 'simper'].includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  try {
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
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!canManageData(session)) {
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
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!canManageData(session)) {
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