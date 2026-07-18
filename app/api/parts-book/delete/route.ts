import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/app/lib/auth'
import { deleteFile } from '@/app/lib/gdrive'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function DELETE(request: NextRequest) {
  // Auth guard — hanya Super Admin
  const auth = await requireSuperAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Parameter id wajib diisi' },
        { status: 400 }
      )
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('parts_book')
      .select('id, drive_file_id, drive_file_name')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    await deleteFile(existing.drive_file_id)

    const { error: updateError } = await supabaseAdmin
      .from('parts_book')
      .update({ is_active: false })
      .eq('id', id)

    if (updateError) {
      console.error('DB Error:', updateError)
      return NextResponse.json(
        { error: 'Gagal update database', detail: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Dokumen "${existing.drive_file_name}" berhasil dihapus`,
    })

  } catch (err: any) {
    console.error('Delete error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    )
  }
}