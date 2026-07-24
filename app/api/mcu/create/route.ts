// app/api/mcu/create/route.ts
// Re-export dari [id]/route.ts logic POST, tapi tanpa ID di URL
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { uploadMcuFile, getMcuFileViewLink } from '@/app/lib/gdrive'
import { getWitaToday } from '@/app/lib/timezone'

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
      const ext = fileMimeType.includes('pdf') ? '.pdf' : fileMimeType.includes('png') ? '.png' : '.jpg'
      fileName = `MCU_${tanggal}_${jenis}${ext}`
    }
    for (const [key, value] of formData.entries()) {
      if (key !== 'file') body[key] = value
    }
  } else {
    body = await req.json()
  }

  const nrp = body.nrp as string
  if (!nrp) return NextResponse.json({ error: 'NRP wajib diisi' }, { status: 400 })

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('nama, jabatan, site')
    .eq('nrp', nrp)
    .single()

  if (!emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

  const butuhFollowup = body.butuh_followup === 'true' || body.butuh_followup === true
  const statusMcu = butuhFollowup ? 'OPEN' : (body.hasil === 'FIT' ? 'FIT' : 'PERLU_PERHATIAN')

  let followupDeadline: string | null = null
  if (butuhFollowup && body.tanggal_mcu) {
    const d = new Date(body.tanggal_mcu as string)
    d.setDate(d.getDate() + 30)
    followupDeadline = d.toISOString().split('T')[0]
  }

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