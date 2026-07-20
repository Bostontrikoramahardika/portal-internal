import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

// Role yang boleh akses Admin Partbook
const ADMIN_ROLES = [
  'super_admin', 'admin_plant', 'gl_plant',
  'pjo_site', 'manager_ops', 'director_ops'
]

// ============================================
// GET /api/partbook/uploads
// List semua upload dengan statistik
// ============================================
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const isAdmin = session.is_super_admin ||
    session.roles?.some((r: string) => ADMIN_ROLES.includes(r))

  if (!isAdmin) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page      = parseInt(searchParams.get('page')      || '1')
  const limit     = parseInt(searchParams.get('limit')     || '20')
  const status    = searchParams.get('status')    || ''
  const unit_code = searchParams.get('unit_code') || ''
  const offset    = (page - 1) * limit

  let query = supabaseAdmin
    .from('partbook_uploads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)    query = query.eq('status', status)
  if (unit_code) query = query.eq('unit_code', unit_code)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    data,
    count,
    page,
    limit
  })
}

// ============================================
// POST /api/partbook/uploads
// Register upload baru via Drive ID
// Body: { drive_file_id, drive_file_name, unit_code, notes }
// ============================================
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const canUpload = session.is_super_admin ||
    session.roles?.some((r: string) => ['super_admin', 'admin_plant', 'gl_plant'].includes(r))

  if (!canUpload) {
    return NextResponse.json({ error: 'Tidak punya akses upload' }, { status: 403 })
  }

  const body = await req.json()
  const { drive_file_id, drive_file_name, unit_code, notes, upload_mode } = body

  // Validasi input
  if (!drive_file_id || !drive_file_name || !unit_code) {
    return NextResponse.json({
      error: 'drive_file_id, drive_file_name, dan unit_code wajib diisi'
    }, { status: 400 })
  }

  // Cek unit_code valid
  const { data: unit, error: unitErr } = await supabaseAdmin
    .from('parts_units')
    .select('id, unit_code, unit_name')
    .eq('unit_code', unit_code)
    .single()

  if (unitErr || !unit) {
    return NextResponse.json({
      error: `Unit code '${unit_code}' tidak ditemukan di database`,
      hint: `Pastikan unit code sesuai. Contoh: PC200-8, D155A-6R, PC210-10M0`
    }, { status: 400 })
  }

  // Cek duplikat Drive File ID
  const { data: existing } = await supabaseAdmin
    .from('partbook_uploads')
    .select('id, file_name, status')
    .eq('drive_file_id', drive_file_id)
    .single()

  if (existing) {
    return NextResponse.json({
      error: `File ini sudah pernah di-import`,
      hint: `File '${existing.file_name}' sudah ada di database dengan status: ${existing.status}. Cek tab Daftar Import.`,
      existing_id: existing.id
    }, { status: 409 })
  }

  // Insert ke partbook_uploads
  const { data: upload, error: insertErr } = await supabaseAdmin
    .from('partbook_uploads')
    .insert({
      file_name:        drive_file_name,
      unit_code:        unit_code,
      unit_id:          unit.id,
      source_type:      'pdf',
      drive_file_id:    drive_file_id,
      drive_file_name:  drive_file_name,
      status:           'pending',
      upload_mode:      upload_mode || 'drive_id',
      uploaded_by:      session.nrp,
      uploaded_by_name: session.nama || session.nrp,
      notes:            notes || null,
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Upload berhasil didaftarkan. File akan diproses segera.`,
    data: upload
  })
}
