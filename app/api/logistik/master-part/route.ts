import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') || ''
  const kategori = searchParams.get('kategori') || ''
  const movement = searchParams.get('movement') || ''
  const merk = searchParams.get('merk') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('master_part')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('part_name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or('part_number.ilike.%' + search + '%,part_name.ilike.%' + search + '%,model_kompatibel.ilike.%' + search + '%')
  }
  if (kategori) {
    query = query.eq('kategori', kategori)
  }
  if (movement) {
    query = query.eq('movement_category', movement)
  }
  if (merk) {
    query = query.eq('merk_kompatibel', merk)
  }

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const body = await req.json()
  const { part_number, part_name, kategori, sub_kategori, merk_kompatibel, model_kompatibel, satuan, min_stock, movement_category, harga_estimasi, catatan } = body

  if (!part_number || !part_name) {
    return NextResponse.json({ error: 'Part Number dan Nama Part wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('master_part')
    .upsert({
      part_number: String(part_number).trim().toUpperCase(),
      part_name: String(part_name).trim(),
      kategori: kategori || 'Sparepart',
      sub_kategori: sub_kategori || '',
      merk_kompatibel: merk_kompatibel || '',
      model_kompatibel: model_kompatibel || '',
      satuan: satuan || 'Pcs',
      min_stock: parseInt(min_stock) || 1,
      movement_category: movement_category || 'FAST',
      harga_estimasi: parseFloat(harga_estimasi) || 0,
      catatan: catatan || '',
      source: 'Manual',
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}