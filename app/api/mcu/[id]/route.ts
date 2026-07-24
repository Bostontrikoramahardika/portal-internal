// app/api/mcu/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { uploadMcuFile, getMcuFileViewLink } from '@/app/lib/gdrive'
import { getWitaToday } from '@/app/lib/timezone'

// ─── GET: Detail satu MCU ─────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!
  const { id } = await params

  const { data: mcu, error } = await supabaseAdmin
    .from('mcu')
    .select(`
      *,
      employees!mcu_nrp_fkey(jabatan, departemen, site, foto_url),
      mcu_findings(*),
      mcu_audit_log(
        id, action, actor_name, actor_role, note, created_at,
        before_data, after_data
      )
    `)
    .eq('id', id)
    .single()

  if (error || !mcu) {
    return NextResponse.json({ error: 'MCU tidak ditemukan' }, { status: 404 })
  }

  // Karyawan hanya bisa lihat MCU sendiri
  const userRoles: string[] = session.roles || []
  const isEmployee = userRoles.every(r => r === 'employee')
  if (isEmployee && mcu.nrp !== session.nrp) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, data: mcu })
}

// ─── PUT: Edit MCU (HR/Super Admin) ──────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!
  const { id } = await params

  const editRoles = ['super_admin','hr_site','she_site','pjo_site','hr_ho']
  const userRoles: string[] = session.roles || []
  if (!userRoles.some(r => editRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // Cek apakah multipart (ada file) atau JSON
  const contentType = req.headers.get('content-type') || ''
  let body: Record<string, unknown> = {}
  let fileBuffer: Buffer | null = null
  let fileName = ''
  let fileMimeType = ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        return NextResponse.json({ error: 'File maks 3MB' }, { status: 400 })
      }
      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
      fileMimeType = file.type
      const tanggal = (formData.get('tanggal_mcu') as string) || getWitaToday()
      const jenis = (formData.get('jenis_mcu') as string || 'umum').replace(/\s+/g, '-').toLowerCase()
      fileName = `MCU_${tanggal}_${jenis}${fileMimeType.includes('pdf') ? '.pdf' : fileMimeType.includes('png') ? '.png' : '.jpg'}`
    }

    // Parse field lain
    for (const [key, value] of formData.entries()) {
      if (key !== 'file') body[key] = value
    }
  } else {
    body = await req.json()
  }

  // Ambil MCU lama untuk audit log
  const { data: mcuLama } = await supabaseAdmin
    .from('mcu')
    .select('*, employees!mcu_nrp_fkey(site, nama)')
    .eq('id', id)
    .single()

  if (!mcuLama) return NextResponse.json({ error: 'MCU tidak ditemukan' }, { status: 404 })

  // Upload file ke Drive jika ada
  let fotoUrl = mcuLama.foto_catatan_url
  let fotoName = mcuLama.foto_catatan_name

  if (fileBuffer) {
    const site = (mcuLama.employees as { site: string })?.site || 'Unknown'
    const nama = mcuLama.nama_karyawan || 'Unknown'
    const { fileId, fileUrl, folderIdKaryawan } = await uploadMcuFile({
      nrp: mcuLama.nrp,
      nama,
      site,
      filename: fileName,
      buffer: fileBuffer,
      mimeType: fileMimeType,
    })
    await getMcuFileViewLink(fileId)
    fotoUrl = fileUrl
    fotoName = fileName
    // Simpan gdrive_folder_id
    body.gdrive_folder_id = folderIdKaryawan
  }

  // Hitung status_mcu otomatis
  const butuhFollowup = body.butuh_followup === 'true' || body.butuh_followup === true
  const statusMcu = butuhFollowup ? 'OPEN' : (body.hasil === 'FIT' ? 'FIT' : 'PERLU_PERHATIAN')

  const updateData = {
    tanggal_mcu: body.tanggal_mcu as string | undefined,
    jenis_mcu: body.jenis_mcu as string | undefined,
    hasil: body.hasil as string | undefined,
    dokter: body.dokter as string | undefined,
    rumah_sakit: body.rumah_sakit as string | undefined,
    tanggal_berlaku: body.tanggal_berlaku as string | undefined,
    tanggal_expired: body.tanggal_expired as string | undefined,
    catatan_hrga: body.catatan_hrga as string | undefined,
    keterangan: body.keterangan as string | undefined,
    temuan_summary: body.temuan_summary as string | undefined,
    butuh_followup: butuhFollowup,
    followup_deadline: body.followup_deadline as string | undefined,
    status_mcu: statusMcu,
    foto_catatan_url: fotoUrl,
    foto_catatan_name: fotoName,
    gdrive_folder_id: body.gdrive_folder_id as string | undefined,
    updated_by: session.nrp,
    updated_at: new Date().toISOString(),
  }

  // Hapus undefined
  const cleanUpdate = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  )

  const { data: updated, error } = await supabaseAdmin
    .from('mcu')
    .update(cleanUpdate)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabaseAdmin.from('mcu_audit_log').insert({
    mcu_id: id,
    action: 'EDIT_MCU',
    actor_nrp: session.nrp,
    actor_name: session.nama,
    actor_role: userRoles[0],
    before_data: mcuLama,
    after_data: updated,
    note: 'Edit data MCU',
  })

  return NextResponse.json({ ok: true, data: updated })
}

// ─── POST: Input MCU Baru ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!

  const editRoles = ['super_admin','hr_site','she_site','pjo_site']
  const userRoles: string[] = session.roles || []
  if (!userRoles.some(r => editRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const contentType = req.headers.get('content-type') || ''
  let body: Record<string, unknown> = {}
  let fileBuffer: Buffer | null = null
  let fileName = ''
  let fileMimeType = ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        return NextResponse.json({ error: 'File maks 3MB' }, { status: 400 })
      }
      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
      fileMimeType = file.type
      const tanggal = (formData.get('tanggal_mcu') as string) || getWitaToday()
      const jenis = (formData.get('jenis_mcu') as string || 'umum').replace(/\s+/g, '-').toLowerCase()
      fileName = `MCU_${tanggal}_${jenis}${fileMimeType.includes('pdf') ? '.pdf' : fileMimeType.includes('png') ? '.png' : '.jpg'}`
    }
    for (const [key, value] of formData.entries()) {
      if (key !== 'file') body[key] = value
    }
  } else {
    body = await req.json()
  }

  const nrp = body.nrp as string
  if (!nrp) return NextResponse.json({ error: 'NRP wajib diisi' }, { status: 400 })

  // Ambil data karyawan
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('nama, jabatan, site')
    .eq('nrp', nrp)
    .single()

  if (!emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

  const butuhFollowup = body.butuh_followup === 'true' || body.butuh_followup === true
  const statusMcu = butuhFollowup ? 'OPEN' : (body.hasil === 'FIT' ? 'FIT' : 'PERLU_PERHATIAN')

  // Deadline FU: 30 hari dari tanggal MCU
  let followupDeadline: string | null = null
  if (butuhFollowup && body.tanggal_mcu) {
    const d = new Date(body.tanggal_mcu as string)
    d.setDate(d.getDate() + 30)
    followupDeadline = d.toISOString().split('T')[0]
  }

  // Upload file
  let fotoUrl: string | null = null
  let fotoName: string | null = null
  let gdriveFolderId: string | null = null

  if (fileBuffer) {
    const { fileId, fileUrl, folderIdKaryawan } = await uploadMcuFile({
      nrp,
      nama: emp.nama,
      site: emp.site || 'Unknown',
      filename: fileName,
      buffer: fileBuffer,
      mimeType: fileMimeType,
    })
    await getMcuFileViewLink(fileId)
    fotoUrl = fileUrl
    fotoName = fileName
    gdriveFolderId = folderIdKaryawan
  }

  const { data: newMcu, error } = await supabaseAdmin
    .from('mcu')
    .insert({
      nrp,
      nama_karyawan: emp.nama,
      tanggal_mcu: body.tanggal_mcu,
      jenis_mcu: body.jenis_mcu || 'MCU Periodik',
      hasil: body.hasil || 'FIT',
      dokter: body.dokter,
      rumah_sakit: body.rumah_sakit,
      tanggal_berlaku: body.tanggal_berlaku,
      tanggal_expired: body.tanggal_expired,
      catatan_hrga: body.catatan_hrga,
      keterangan: body.keterangan,
      temuan_summary: body.temuan_summary,
      butuh_followup: butuhFollowup,
      followup_deadline: followupDeadline,
      status_mcu: statusMcu,
      foto_catatan_url: fotoUrl,
      foto_catatan_name: fotoName,
      gdrive_folder_id: gdriveFolderId,
      uploaded_by: session.nrp,
      uploaded_at: new Date().toISOString(),
      updated_by: session.nrp,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabaseAdmin.from('mcu_audit_log').insert({
    mcu_id: newMcu.id,
    action: 'CREATE_MCU',
    actor_nrp: session.nrp,
    actor_name: session.nama,
    actor_role: userRoles[0],
    after_data: newMcu,
    note: 'Input MCU baru',
  })

  return NextResponse.json({ ok: true, data: newMcu })
}