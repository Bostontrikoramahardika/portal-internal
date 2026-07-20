import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { processUpload } from '@/app/lib/partbook-parser'
import { supabaseAdmin } from '@/app/lib/supabase'

// Vercel timeout — set max 60 detik (limit hobby plan)
export const maxDuration = 60

// ============================================
// POST /api/partbook/process
// Body: { upload_id }
// ============================================
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const canProcess = session.is_super_admin ||
    session.roles?.some((r: string) =>
      ['super_admin', 'admin_plant', 'gl_plant'].includes(r)
    )

  if (!canProcess) {
    return NextResponse.json({
      error: 'Tidak punya akses proses partbook'
    }, { status: 403 })
  }

  const body = await req.json()
  const { upload_id } = body

  if (!upload_id) {
    return NextResponse.json({
      error: 'upload_id wajib diisi'
    }, { status: 400 })
  }

  // Cek upload ada
  const { data: upload } = await supabaseAdmin
    .from('partbook_uploads')
    .select('id, file_name, status, drive_file_id')
    .eq('id', upload_id)
    .single()

  if (!upload) {
    return NextResponse.json({
      error: 'Upload tidak ditemukan'
    }, { status: 404 })
  }

  if (upload.status === 'processing') {
    return NextResponse.json({
      error: 'File sedang diproses',
      hint: 'Tunggu proses selesai sebelum menjalankan ulang.'
    }, { status: 409 })
  }

  if (!upload.drive_file_id) {
    return NextResponse.json({
      error: 'Upload tidak punya Drive File ID',
      hint: 'File tidak bisa diproses karena tidak ada di Google Drive.'
    }, { status: 400 })
  }

  // JALANKAN PROSES
  try {
    const result = await processUpload(upload_id)
    return NextResponse.json({
      ok: true,
      message: `File '${upload.file_name}' berhasil diproses.`,
      data: result,
    })
  } catch (err: any) {
    console.error('Process error:', err)
    return NextResponse.json({
      error: 'Gagal memproses file',
      hint: err.message || 'Coba lagi. Jika masalah berlanjut, hubungi administrator.',
      detail: err.message,
    }, { status: 500 })
  }
}