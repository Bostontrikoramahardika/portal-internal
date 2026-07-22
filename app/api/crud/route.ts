// app/api/crud/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { hasPermission } from '@/app/lib/permissions'
import { getTablePermissions } from '@/app/lib/tablePermissions'

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

// 🔐 Helper: cek permission spesifik per operasi CRUD
function checkTablePermission(
  session: any,
  table: string,
  operation: 'create' | 'edit' | 'delete'
): { allowed: boolean; reason?: string } {
  
  // Super admin bypass semua
  if (session.is_super_admin) return { allowed: true }

  const tablePerm = getTablePermissions(table)
  
  // Tabel tidak ada di TABLE_PERMISSIONS → izinkan (tabel internal/legacy)
  if (!tablePerm) return { allowed: true }

  const requiredPerm = tablePerm[operation]

  // Tabel tidak punya requirement untuk operasi ini → izinkan
  if (!requiredPerm) return { allowed: true }

  // Cek apakah user punya permission key yang dibutuhkan
  const allowed = hasPermission(session, requiredPerm)
  
  if (!allowed) {
    return { 
      allowed: false, 
      reason: `Akses ditolak. Butuh permission: ${requiredPerm}` 
    }
  }

  return { allowed: true }
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkAccess(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { table, values } = await req.json()
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 400 })
    }

    // 🔐 Cek permission CREATE
    const permCheck = checkTablePermission(session, table, 'create')
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 })
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

    // 🔐 Cek permission EDIT
    const permCheck = checkTablePermission(session, table, 'edit')
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 })
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
  
  // Baca dari query string ATAU body (fleksibel)
  let table = ''
  let id = ''
  
  const { searchParams } = new URL(req.url)
  table = searchParams.get('table') || ''
  id = searchParams.get('id') || ''
  
  // Kalau kosong, coba baca dari body
  if (!table || !id) {
    try {
      const body = await req.json()
      table = table || body.table || ''
      id = id || body.id || ''
    } catch {}
  }
    
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 400 })
    }

    // 🔐 Cek permission DELETE
    const permCheck = checkTablePermission(session, table, 'delete')
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 })
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
        // 🔐 Cek permission DELETE untuk bulk
        const permCheck = checkTablePermission(session, table, 'delete')
        if (!permCheck.allowed) {
          return NextResponse.json({ error: permCheck.reason }, { status: 403 })
        }

        const { error } = await supabase.from(table).delete().in('id', ids)
        if (error) throw error
        return NextResponse.json({ message: 'Bulk Deleted' })
      }
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
}