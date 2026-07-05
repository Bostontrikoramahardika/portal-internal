import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getSession } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    
    // Gunakan bucket announcement-images untuk semua gambar pengumuman/mcu sementara
    // Atau bisa buat bucket mcu-photos jika mau dipisah
    const { data, error: uploadError } = await supabase.storage
      .from('announcement-images')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('announcement-images')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })

  } catch (err: any) {
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 })
  }
}