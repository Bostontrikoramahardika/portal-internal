import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const warehouse = searchParams.get('warehouse') || ''
  const search = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('stock_barang')
    .select(`
      id,
      warehouse_code,
      part_number,
      qty_tersedia,
      qty_reserved,
      rak_lokasi,
      updated_at,
      master_part:part_number (
        part_name,
        kategori,
        merk_kompatibel,
        model_kompatibel,
        satuan,
        min_stock,
        movement_category
      ),
      warehouses:warehouse_code (
        nama_gudang,
        site_code
      )
    `, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (warehouse) {
    query = query.eq('warehouse_code', warehouse)
  }
  if (search) {
    query = query.ilike('part_number', '%' + search + '%')
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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