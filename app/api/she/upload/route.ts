// app/api/she/upload/route.ts
// Upload foto temuan inspeksi / observasi ke bucket `she-files`

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/app/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const VIEW_ROLES = [
  'she_site', 'spv_she_ho', 'hr_site', 'hrga_site', 'hr_ho', 'hrga', 'hrga_pusat',
  'pjo_site', 'pjo', 'gl_produksi', 'gl_plant', 'atasan',
  'admin', 'admin_site', 'admin_plant', 'super_admin', 'director_ops', 'manager_ops',
]

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const roles = ((session as any).roles || []).map((r: string) => String(r).toLowerCase())
  const boleh = (session as any).is_super_admin || roles.some((r: string) => VIEW_ROLES.includes(r))
  if (!boleh) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const jenis = String(form.get('jenis') || 'INSPEKSI').toUpperCase()

    if (!file) return NextResponse.json({ error: 'File wajib diisi' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Foto terlalu besar (maks 5 MB)' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Format harus JPG, PNG, atau WEBP' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const tanggal = new Date().toISOString().slice(0, 10)
    const nama = `she/${jenis}/${tanggal}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('she-files')
      .upload(nama, file, { upsert: false, contentType: file.type })

    if (upErr) {
      const pesan = String(upErr.message || '')
      if (pesan.toLowerCase().includes('bucket')) {
        return NextResponse.json({
          error: 'Bucket `she-files` belum ada. Jalankan scripts/punishment-dan-she.sql dulu.',
        }, { status: 500 })
      }
      return NextResponse.json({ error: pesan }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('she-files').getPublicUrl(nama)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: nama,
      nama_asli: file.name,
      message: 'Foto terunggah',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal upload' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
