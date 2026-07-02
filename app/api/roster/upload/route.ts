import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!session.roles.includes('hrga') && !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Hanya HRGA/Admin yang bisa upload' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const periode = formData.get('periode') as string
    const site = formData.get('site') as string
    const departemen = formData.get('departemen') as string
    const keterangan = formData.get('keterangan') as string

    if (!file || !periode) {
      return NextResponse.json({ error: 'File dan periode wajib diisi' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipe file harus PDF, PNG, atau JPG' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10 MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${periode.replace(/\s+/g, '_')}_${site || 'ALL'}_${Date.now()}.${fileExt}`
    const filePath = `${periode.replace(/\s+/g, '_')}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('roster-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Upload gagal: ' + uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('roster-files')
      .getPublicUrl(filePath)

    const { data: newRecord, error: insertError } = await supabase
      .from('roster_files')
      .insert({
        periode,
        site: site || null,
        departemen: departemen || null,
        nama_file: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        keterangan: keterangan || null,
        uploaded_by: session.nrp
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '✅ Roster berhasil di-upload',
      data: newRecord
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!session.roles.includes('hrga') && !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Hanya HRGA/Admin yang bisa hapus' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { data: file } = await supabase
    .from('roster_files')
    .select('file_url')
    .eq('id', id)
    .single()

  if (file?.file_url) {
    const url = new URL(file.file_url)
    const pathMatch = url.pathname.match(/\/roster-files\/(.+)$/)
    if (pathMatch) {
      await supabase.storage.from('roster-files').remove([pathMatch[1]])
    }
  }

  const { error } = await supabase.from('roster_files').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: '✅ File dihapus' })
}