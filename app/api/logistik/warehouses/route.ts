import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await supabaseAdmin
    .from('warehouses')
    .select('*')
    .eq('is_active', true)
    .order('warehouse_code', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const body = await req.json()
  const { warehouse_code, nama_gudang, site_code, lokasi_fisik, penanggung_jawab_nrp, penanggung_jawab_nama } = body

  if (!warehouse_code || !nama_gudang || !site_code) {
    return NextResponse.json({ error: 'Kode Gudang, Nama Gudang, dan Site wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('warehouses')
    .upsert({
      warehouse_code: String(warehouse_code).trim().toUpperCase(),
      nama_gudang: String(nama_gudang).trim(),
      site_code: String(site_code).trim(),
      lokasi_fisik: lokasi_fisik || '',
      penanggung_jawab_nrp: penanggung_jawab_nrp || '',
      penanggung_jawab_nama: penanggung_jawab_nama || '',
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}