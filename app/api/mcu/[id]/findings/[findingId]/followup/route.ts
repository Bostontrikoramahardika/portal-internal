// app/api/mcu/[id]/findings/[findingId]/followup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { uploadMcuFile, getMcuFileViewLink } from '@/app/lib/gdrive'
import { getWitaToday } from '@/app/lib/timezone'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!
  const { id, findingId } = await params

  // Ambil finding + MCU
  const { data: finding } = await supabaseAdmin
    .from('mcu_findings')
    .select('*, mcu!inner(nrp, nama_karyawan, tanggal_mcu, employees!mcu_nrp_fkey(site))')
    .eq('id', findingId)
    .eq('mcu_id', id)
    .single()

  if (!finding) return NextResponse.json({ error: 'Temuan tidak ditemukan' }, { status: 404 })

  // Karyawan hanya bisa setor FU untuk MCU sendiri
  const mcu = finding.mcu as { nrp: string; nama_karyawan: string; tanggal_mcu: string; employees: { site: string } }
  const userRoles: string[] = session.roles || []
  const isEmployee = userRoles.every(r => r === 'employee')
  if (isEmployee && mcu.nrp !== session.nrp) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const keterangan = formData.get('keterangan') as string || ''

  if (!file) return NextResponse.json({ error: 'File bukti FU wajib diupload' }, { status: 400 })
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'File maks 3MB' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mimeType = file.type
  const tanggal = getWitaToday()
  const jenisClean = finding.jenis_temuan.replace(/\s+/g, '-').toLowerCase()
  const ext = mimeType.includes('pdf') ? '.pdf' : mimeType.includes('png') ? '.png' : '.jpg'
  const filename = `MCU_${mcu.tanggal_mcu}_FU-${jenisClean}_${tanggal}${ext}`

  const { fileId, fileUrl } = await uploadMcuFile({
    nrp: mcu.nrp,
    nama: mcu.nama_karyawan,
    site: mcu.employees?.site || 'Unknown',
    filename,
    buffer,
    mimeType,
  })
  await getMcuFileViewLink(fileId)

  // Update finding
  const { data: updated, error } = await supabaseAdmin
    .from('mcu_findings')
    .update({
      status_followup: 'SUDAH_FU',
      followup_file_url: fileUrl,
      followup_file_name: filename,
      followup_file_drive_id: fileId,
      followup_keterangan: keterangan,
      followup_submitted_at: new Date().toISOString(),
    })
    .eq('id', findingId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabaseAdmin.from('mcu_audit_log').insert({
    mcu_id: id,
    finding_id: findingId,
    action: 'SUBMIT_FOLLOWUP',
    actor_nrp: session.nrp,
    actor_name: session.nama,
    actor_role: userRoles[0] || 'employee',
    after_data: updated,
    note: `Setor bukti FU: ${finding.jenis_temuan}`,
  })

  return NextResponse.json({ ok: true, data: updated })
}