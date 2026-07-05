import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '../../../lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Cek role HRGA
  const { data: roleData } = await supabase
    .from('roles')
    .select('role')
    .eq('nrp', session.nrp)
    .eq('active', true)
    .eq('role', 'hrga')
  if (!roleData || roleData.length === 0) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa upload foto MCU' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const mcuId = formData.get('mcu_id') as string
    const catatan = formData.get('catatan') as string | null

    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })
    if (!mcuId) return NextResponse.json({ error: 'MCU ID required' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File terlalu besar (max 5MB)' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format harus JPG, PNG, WEBP, atau PDF' }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const fileName = `mcu/${mcuId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    // Upload ke storage
    const { error: uploadError } = await supabase.storage
      .from('mcu-photos')
      .upload(fileName, file, { upsert: false })

    if (uploadError) throw uploadError

    // Ambil public URL
    const { data: urlData } = supabase.storage
      .from('mcu-photos')
      .getPublicUrl(fileName)

    // Update record MCU
    const { data: updated, error: updateError } = await supabase
      .from('mcu')
      .update({
        foto_catatan_url: urlData.publicUrl,
        foto_catatan_name: file.name,
        catatan_hrga: catatan || null,
        uploaded_by: session.nrp,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mcuId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ 
      data: updated, 
      message: 'Foto catatan MCU berhasil diupload' 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE foto
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('roles')
    .select('role')
    .eq('nrp', session.nrp)
    .eq('active', true)
    .eq('role', 'hrga')
  if (!roleData || roleData.length === 0) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa hapus foto' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const mcuId = searchParams.get('id')
    if (!mcuId) return NextResponse.json({ error: 'MCU ID required' }, { status: 400 })

    // Ambil data dulu untuk dapet URL foto
    const { data: mcuData } = await supabase
      .from('mcu')
      .select('foto_catatan_url')
      .eq('id', mcuId)
      .single()

    // Hapus dari storage kalau ada
    if (mcuData?.foto_catatan_url) {
      const path = mcuData.foto_catatan_url.split('/mcu-photos/')[1]
      if (path) {
        await supabase.storage.from('mcu-photos').remove([path])
      }
    }

    // Clear field foto di database
    const { error } = await supabase
      .from('mcu')
      .update({
        foto_catatan_url: null,
        foto_catatan_name: null,
        uploaded_by: null,
        uploaded_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mcuId)

    if (error) throw error
    return NextResponse.json({ message: 'Foto berhasil dihapus' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}