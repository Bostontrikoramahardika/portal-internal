import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/app/lib/auth'
import { uploadFile } from '@/app/lib/gdrive'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  // Auth guard — hanya Super Admin
  const authError = await requireSuperAdmin(request)
  if (authError) return authError

  try {
    const formData = await request.formData()

    // Ambil file
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    // Validasi tipe file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak diizinkan. Hanya PDF, JPG, PNG' },
        { status: 400 }
      )
    }

    // Validasi ukuran — max 50MB
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas 50MB' },
        { status: 400 }
      )
    }

    // Ambil metadata dari form
    const unit_name   = formData.get('unit_name')   as string
    const unit_model  = formData.get('unit_model')  as string | null
    const unit_serial = formData.get('unit_serial') as string | null
    const doc_type    = formData.get('doc_type')    as string
    const category    = formData.get('category')    as string | null
    const notes       = formData.get('notes')       as string | null
    const uploaded_by = formData.get('uploaded_by') as string

    if (!unit_name || !doc_type) {
      return NextResponse.json(
        { error: 'unit_name dan doc_type wajib diisi' },
        { status: 400 }
      )
    }

    // Convert File ke Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload ke Google Drive
    const driveResult = await uploadFile(file.name, file.type, buffer)

    // Insert ke Supabase
    const { data, error: dbError } = await supabaseAdmin
      .from('parts_book')
      .insert({
        unit_name,
        unit_model:             unit_model  || null,
        unit_serial:            unit_serial || null,
        doc_type,
        category:               category    || null,
        notes:                  notes       || null,
        drive_file_id:          driveResult.fileId,
        drive_file_name:        driveResult.fileName,
        drive_mime_type:        driveResult.mimeType,
        drive_size_bytes:       parseInt(driveResult.size || '0'),
        drive_web_view_link:    driveResult.webViewLink,
        drive_web_content_link: driveResult.webContentLink,
        uploaded_by:            uploaded_by || 'unknown',
        is_active:              true,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json(
        { error: 'Gagal simpan ke database', detail: dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File berhasil diupload',
      data,
    })

  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    )
  }
}