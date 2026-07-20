import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

const ADMIN_ROLES = [
  'super_admin', 'admin_plant', 'gl_plant',
  'pjo_site', 'manager_ops', 'director_ops'
]

// ============================================
// GET /api/partbook/uploads/[id]
// Detail 1 upload + semua halaman
// ============================================
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const isAdmin = session.is_super_admin ||
    session.roles?.some((r: string) => ADMIN_ROLES.includes(r))

  if (!isAdmin) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { id } = params
  const { searchParams } = new URL(req.url)
  const filter_status = searchParams.get('status') || '' // success|failed|no_parts

  // Ambil data upload
  const { data: upload, error: uploadErr } = await supabaseAdmin
    .from('partbook_uploads')
    .select('*')
    .eq('id', id)
    .single()

  if (uploadErr || !upload) {
    return NextResponse.json({ error: 'Upload tidak ditemukan' }, { status: 404 })
  }

  // Ambil semua halaman
  let pageQuery = supabaseAdmin
    .from('partbook_pages')
    .select('*')
    .eq('upload_id', id)
    .order('page_number', { ascending: true })

  if (filter_status) {
    pageQuery = pageQuery.eq('status', filter_status)
  }

  const { data: pages, error: pagesErr } = await pageQuery
  if (pagesErr) return NextResponse.json({ error: pagesErr.message }, { status: 500 })

  // Hitung summary
  const summary = {
    total:    pages?.length || 0,
    success:  pages?.filter(p => p.status === 'success').length  || 0,
    failed:   pages?.filter(p => p.status === 'failed').length   || 0,
    no_parts: pages?.filter(p => p.status === 'no_parts').length || 0,
    pending:  pages?.filter(p => p.status === 'pending').length  || 0,
  }

  return NextResponse.json({
    ok: true,
    data: {
      upload,
      pages: pages || [],
      summary
    }
  })
}

// ============================================
// PATCH /api/partbook/uploads/[id]
// Update notes atau trigger re-process
// Body: { notes } atau { action: 'reprocess' }
// ============================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const canEdit = session.is_super_admin ||
    session.roles?.some((r: string) => ['super_admin', 'admin_plant', 'gl_plant'].includes(r))

  if (!canEdit) {
    return NextResponse.json({ error: 'Tidak punya akses edit' }, { status: 403 })
  }

  const { id } = params
  const body = await req.json()
  const { action, notes } = body

  if (action === 'reprocess') {
    // Reset status ke pending agar bisa diproses ulang
    const { error } = await supabaseAdmin
      .from('partbook_uploads')
      .update({
        status:        'pending',
        error_summary: null,
        started_at:    null,
        finished_at:   null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: 'Upload direset ke pending. Silakan proses ulang.'
    })
  }

  // Update notes
  if (notes !== undefined) {
    const { error } = await supabaseAdmin
      .from('partbook_uploads')
      .update({ notes })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: 'Notes berhasil diupdate' })
  }

  return NextResponse.json({ error: 'Action tidak dikenali' }, { status: 400 })
}

// ============================================
// DELETE /api/partbook/uploads/[id]
// Soft delete: nonaktifkan upload + pages
// ============================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const canDelete = session.is_super_admin ||
    session.roles?.some((r: string) => ['super_admin', 'admin_plant'].includes(r))

  if (!canDelete) {
    return NextResponse.json({
      error: 'Hanya Admin Plant atau Super Admin yang bisa menghapus upload'
    }, { status: 403 })
  }

  const { id } = params

  // Cek upload ada
  const { data: upload } = await supabaseAdmin
    .from('partbook_uploads')
    .select('id, file_name, status')
    .eq('id', id)
    .single()

  if (!upload) {
    return NextResponse.json({ error: 'Upload tidak ditemukan' }, { status: 404 })
  }

  // Jangan hapus yang sedang processing
  if (upload.status === 'processing') {
    return NextResponse.json({
      error: 'Tidak bisa menghapus file yang sedang diproses',
      hint: 'Tunggu proses selesai, lalu hapus.'
    }, { status: 409 })
  }

  // Hapus pages dulu (cascade harusnya otomatis, tapi explicit lebih aman)
  await supabaseAdmin
    .from('partbook_pages')
    .delete()
    .eq('upload_id', id)

  // Hapus upload
  const { error } = await supabaseAdmin
    .from('partbook_uploads')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    message: `Upload '${upload.file_name}' berhasil dihapus`
  })
}