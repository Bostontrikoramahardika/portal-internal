// app/api/crud/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

const ALLOWED_TABLES = [
  'employees', 'kpi', 'apd', 'pkwt', 'sp', 'roster', 
  'attendance', 'roles', 'approval_matrix', 'announcements',
  'bpjs', 'mcu', 'simper', 'apd_history', 'attendance_evidences',
  'sites_config',
  'kpi_settings',
  'job_categories' // ✅ v1.5.0
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

export async function POST(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { table, values } = await req.json()
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 400 })
    }

    const dataToSave = cleanData({ ...values })
    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
const HRGA_ROLES = ['hrga', 'admin', 'hrga_oprek', 'hrga_site', 'hrga_pusat', 'admin_site', 'admin_plant']
const isStaff = !HRGA_ROLES.some(r => rolesLower.includes(r))

    if (isStaff) {
      if (['apd_history', 'attendance_evidences', 'bpjs'].includes(table)) {
        dataToSave.nama_karyawan = session.nama || 'Unknown'
      }
      if (['pkwt', 'leave_requests', 'overtime_requests', 'attendance'].includes(table)) {
        dataToSave.nrp = session.nrp
      }
    }

    if (table === 'announcements') dataToSave.created_by = session.nrp

    const { data, error } = await supabase.from(table).insert(dataToSave).select()
    if (error) throw error

    return NextResponse.json({ data: data ? data[0] : null, message: 'Success' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { table, id, values } = await req.json()
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 400 })
    }

    const dataToUpdate = cleanData({ ...values })
    
    // Gunakan update berdasarkan ID (integer) atau Kode (string) jika ID tidak ada
    const query = supabase.from(table).update(dataToUpdate)
    
    if (id) {
        query.eq('id', id)
    } else if (values.kode) {
        query.eq('kode', values.kode)
    } else {
        throw new Error("Missing ID or Kode for update")
    }

    const { data, error } = await query.select()
    if (error) throw error

    return NextResponse.json({ data: data ? data[0] : null, message: 'Updated' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table') || ''
    const id = searchParams.get('id') || ''
    
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 400 })
    }

    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ message: 'Deleted' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
    try {
      const session = await checkAccess(req)
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      
      const { table, ids, action } = await req.json()
      if (action === 'bulk_delete' && ALLOWED_TABLES.includes(table)) {
        const { error } = await supabase.from(table).delete().in('id', ids)
        if (error) throw error
        return NextResponse.json({ message: 'Bulk Deleted' })
      }
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
}