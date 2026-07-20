import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

// ============================================
// GET /api/partbook/units
// List semua unit + jumlah assembly & upload
// Untuk dropdown di form upload
// ============================================
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data: units, error } = await supabaseAdmin
    .from('parts_units')
    .select(`
      id,
      unit_code,
      unit_name,
      brand,
      created_at
    `)
    .order('unit_code', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hitung jumlah assembly per unit
  const { data: assemblyCounts } = await supabaseAdmin
    .from('parts_assemblies')
    .select('unit_id')

  const countMap: Record<string, number> = {}
  assemblyCounts?.forEach(a => {
    countMap[a.unit_id] = (countMap[a.unit_id] || 0) + 1
  })

  const result = units?.map(u => ({
    ...u,
    assembly_count: countMap[u.id] || 0
  }))

  return NextResponse.json({ ok: true, data: result })
}

// TAMBAH function POST ini di file yang sama:

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const canAdd = session.is_super_admin ||
    session.roles?.some((r: string) =>
      ['super_admin', 'admin_plant', 'gl_plant'].includes(r)
    )

  if (!canAdd) {
    return NextResponse.json({ error: 'Tidak punya akses tambah unit' }, { status: 403 })
  }

  const body = await req.json()
  const { unit_code, unit_name, brand } = body

  if (!unit_code || !unit_name) {
    return NextResponse.json({
      error: 'Unit code dan nama wajib diisi',
      hint: 'Contoh: unit_code = "PC1250-8", unit_name = "Komatsu PC1250-8"'
    }, { status: 400 })
  }

  // Cek duplikat
  const { data: existing } = await supabaseAdmin
    .from('parts_units')
    .select('id, unit_code')
    .eq('unit_code', unit_code.trim().toUpperCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: `Unit '${unit_code}' sudah ada`,
      hint: 'Gunakan unit yang sudah ada, atau pakai kode berbeda.',
      existing_id: existing.id
    }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('parts_units')
    .insert({
      unit_code: unit_code.trim().toUpperCase(),
      unit_name: unit_name.trim(),
      brand: brand || 'Komatsu',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    message: `Unit '${data.unit_code}' berhasil ditambahkan`,
    data
  })
}