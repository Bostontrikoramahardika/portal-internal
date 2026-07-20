import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'
import { uploadFile } from '@/app/lib/gdrive'

// Vercel punya limit upload sekitar 4.5MB.
// Kita pakai 4MB supaya aman di production.
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

// ============================================
// POST /api/partbook/upload-file
// Upload PDF kecil langsung via browser
// Form data: file, unit_code, notes
// ============================================
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const session = auth.session

  const canUpload =
    session.is_super_admin ||
    session.roles?.some((r: string) =>
      ['super_admin', 'admin_plant', 'gl_plant'].includes(r)
    )

  if (!canUpload) {
    return NextResponse.json(
      { error: 'Tidak punya akses upload partbook' },
      { status: 403 }
    )
  }

  let formData: FormData

  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      {
        error: 'Gagal membaca form data',
        hint: 'Pastikan request menggunakan multipart/form-data.',
      },
      { status: 400 }
    )
  }

  const file = formData.get('file') as File | null
  const unit_code = formData.get('unit_code') as string | null
  const notes = formData.get('notes') as string | null

  if (!file) {
    return NextResponse.json(
      { error: 'File PDF wajib diupload' },
      { status: 400 }
    )
  }

  if (!unit_code) {
    return NextResponse.json(
      { error: 'Unit code wajib dipilih' },
      { status: 400 }
    )
  }

  const fileName = file.name || 'partbook.pdf'
  const fileType = file.type || 'application/pdf'

  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json(
      {
        error: 'Hanya file PDF yang diizinkan',
        hint: 'Pastikan file berformat .pdf.',
      },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)

    return NextResponse.json(
      {
        error: `File terlalu besar (${sizeMB} MB)`,
        hint:
          'Upload langsung hanya untuk file kecil maksimal 4MB karena limit Vercel. Untuk file besar, upload manual ke Google Drive lalu input Drive File ID di menu Admin Partbook.',
      },
      { status: 413 }
    )
  }

  // Validasi unit
  const { data: unit, error: unitErr } = await supabaseAdmin
    .from('parts_units')
    .select('id, unit_code, unit_name')
    .eq('unit_code', unit_code)
    .single()

  if (unitErr || !unit) {
    return NextResponse.json(
      {
        error: `Unit code '${unit_code}' tidak ditemukan`,
        hint: 'Pastikan unit code sesuai data katalog. Contoh: PC200-8, D155A-6R, PC210-10M0.',
      },
      { status: 400 }
    )
  }

  // Convert file ke buffer
  let buffer: Buffer

  try {
    const arrayBuffer = await file.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } catch {
    return NextResponse.json(
      {
        error: 'Gagal membaca file PDF',
        hint: 'Coba upload ulang file. Jika masih gagal, download ulang PDF dari sumber aslinya.',
      },
      { status: 400 }
    )
  }

  // Upload ke Google Drive pakai helper existing
  let driveResult

  try {
    driveResult = await uploadFile(fileName, fileType, buffer)
  } catch (err: any) {
    console.error('GDrive upload error:', err)

    return NextResponse.json(
      {
        error: 'Gagal upload file ke Google Drive',
        hint:
          'Periksa koneksi internet, Google Drive credentials, atau refresh token. Jika masalah berlanjut, hubungi administrator.',
        detail: err?.message || String(err),
      },
      { status: 500 }
    )
  }

  // Cek apakah Drive file ID sudah pernah masuk
  const { data: existing } = await supabaseAdmin
    .from('partbook_uploads')
    .select('id, file_name, status')
    .eq('drive_file_id', driveResult.fileId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      {
        error: 'File ini sudah pernah didaftarkan',
        hint: `File '${existing.file_name}' sudah ada dengan status '${existing.status}'. Cek tab Daftar Import.`,
        existing_id: existing.id,
      },
      { status: 409 }
    )
  }

  // Simpan tracking upload ke DB
  const { data: upload, error: insertErr } = await supabaseAdmin
    .from('partbook_uploads')
    .insert({
      file_name: fileName,
      unit_code,
      unit_id: unit.id,
      source_type: 'pdf',

      drive_file_id: driveResult.fileId,
      drive_file_name: driveResult.fileName,
      drive_web_link: driveResult.webViewLink,

      status: 'pending',
      upload_mode: 'web',

      uploaded_by: session.nrp,
      uploaded_by_name: (session as any).nama || session.nrp,

      notes: notes || null,
    })
    .select()
    .single()

  if (insertErr) {
    console.error('Insert partbook_uploads error:', insertErr)

    return NextResponse.json(
      {
        error: 'File berhasil upload ke Drive, tapi gagal simpan ke database',
        hint: 'Hubungi administrator. File sudah ada di Google Drive, tapi belum tercatat di sistem.',
        detail: insertErr.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: `File '${fileName}' berhasil diupload dan didaftarkan. Status: pending.`,
    data: upload,
  })
}