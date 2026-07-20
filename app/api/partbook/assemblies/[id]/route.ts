import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

// ============================================
// PATCH /api/partbook/assemblies/[id]
// Edit nama assembly manual
// Body: { assembly_name }
// ============================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const canEdit = session.is_super_admin ||
    session.roles?.some((r: string) =>
      ['super_admin', 'admin_plant', 'gl_plant'].includes(r)
    )

  if (!canEdit) {
    return NextResponse.json({ error: 'Tidak punya akses edit assembly' }, { status: 403 })
  }

  const { id } = params
  const body = await req.json()
  const { assembly_name } = body

  if (!assembly_name || assembly_name.trim() === '') {
    return NextResponse.json({
      error: 'Nama assembly tidak boleh kosong'
    }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('parts_assemblies')
    .update({ assembly_name: assembly_name.trim().toUpperCase() })
    .eq('id', id)
    .select('id, assembly_name, sheet_name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    message: 'Nama assembly berhasil diupdate',
    data
  })
}

// ============================================
// DELETE /api/partbook/assemblies/[id]
// Hapus 1 assembly + semua items-nya
// ============================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const canDelete = session.is_super_admin ||
    session.roles?.some((r: string) =>
      ['super_admin', 'admin_plant'].includes(r)
    )

  if (!canDelete) {
    return NextResponse.json({
      error: 'Hanya Admin Plant atau Super Admin yang bisa menghapus assembly'
    }, { status: 403 })
  }

  const { id } = params

  // Hapus items dulu
  await supabaseAdmin
    .from('parts_items')
    .delete()
    .eq('assembly_id', id)

  // Hapus assembly
  const { error } = await supabaseAdmin
    .from('parts_assemblies')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    message: 'Assembly dan semua items berhasil dihapus'
  })
}