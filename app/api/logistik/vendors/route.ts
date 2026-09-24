import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await supabaseAdmin
    .from('master_vendor')
    .select('*')
    .eq('is_active', true)
    .order('nama_vendor', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const body = await req.json()
  const { vendor_code, nama_vendor, kategori_suplai, alamat, no_telepon, email, nama_pic, kontak_pic } = body

  if (!vendor_code || !nama_vendor) {
    return NextResponse.json({ error: 'Kode dan Nama Vendor wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('master_vendor')
    .upsert({
      vendor_code: String(vendor_code).trim().toUpperCase(),
      nama_vendor: String(nama_vendor).trim(),
      kategori_suplai: kategori_suplai || 'Sparepart & Oli',
      alamat: alamat || '',
      no_telepon: no_telepon || '',
      email: email || '',
      nama_pic: nama_pic || '',
      kontak_pic: kontak_pic || '',
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}