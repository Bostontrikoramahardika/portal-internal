// app/api/mcu/[id]/findings/[findingId]/rujukan/route.ts
// HR upload / delete surat rujukan per temuan
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { uploadMcuFile } from '@/app/lib/gdrive'

export const runtime = 'nodejs'
export const maxDuration = 60

const HR_ROLES = ['super_admin', 'hr_ho', 'hr_site']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ═══════════════════════════════════════════════════════════════
// POST — Upload surat rujukan
// ═══════════════════════════════════════════════════════════════
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, findingId: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  if (!isSuperAdmin && !HR_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Hanya HR yang bisa upload surat rujukan' }, { status: 403 })
  }

  const { id, findingId } = await params

  try {
    // 1. Ambil data MCU + Finding
    const { data: mcu, error: mcuErr } = await supabaseAdmin
      .from('mcu')
      .select('id, nrp, nama_karyawan')
      .eq('id', id)
      .single()

    if (mcuErr || !mcu) return NextResponse.json({ error: 'MCU tidak ditemukan' }, { status: 404 })

    const { data: finding, error: findErr } = await supabaseAdmin
      .from('mcu_findings')
      .select('id, jenis_temuan, rujukan_file_drive_id')
      .eq('id', findingId)
      .eq('mcu_id', id)
      .single()

    if (findErr || !finding) return NextResponse.json({ error: 'Temuan tidak ditemukan' }, { status: 404 })

    // 2. Get karyawan info (untuk folder Drive)
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('nama, site')
      .eq('nrp', mcu.nrp)
      .single()

    // 3. Parse file
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    // Validasi
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File terlalu besar (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Format file harus PDF' }, { status: 400 })
    }

    // 4. Upload ke Google Drive
    const buffer = Buffer.from(await file.arrayBuffer())
    const jenisSlug = finding.jenis_temuan.toLowerCase().replace(/\s+/g, '-')
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `rujukan_${jenisSlug}_${timestamp}.pdf`

    const { fileId, fileUrl } = await uploadMcuFile({
      nrp: mcu.nrp,
      nama: emp?.nama || mcu.nama_karyawan,
      site: emp?.site || 'UNKNOWN',
      filename,
      buffer,
      mimeType: 'application/pdf',
    })

    // 5. Update finding (kalau ada file lama, log-nya di audit)
    const oldDriveId = finding.rujukan_file_drive_id

    const { error: updateErr } = await supabaseAdmin
      .from('mcu_findings')
      .update({
        rujukan_file_url: fileUrl,
        rujukan_file_name: filename,
        rujukan_file_drive_id: fileId,
        rujukan_uploaded_at: new Date().toISOString(),
        rujukan_uploaded_by: session.nrp,
      })
      .eq('id', findingId)

    if (updateErr) {
      console.error('[Rujukan Upload] DB update error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // 6. Audit log
    await supabaseAdmin.from('mcu_audit_log').insert({
      mcu_id: id,
      finding_id: findingId,
      action: oldDriveId ? 'RUJUKAN_REPLACED' : 'RUJUKAN_UPLOADED',
      actor_nrp: session.nrp,
      actor_name: session.nama,
      actor_role: role,
      after_data: { filename, file_id: fileId },
      note: `HR upload surat rujukan untuk temuan ${finding.jenis_temuan}`,
    })

    return NextResponse.json({
      ok: true,
      message: `Surat rujukan untuk temuan "${finding.jenis_temuan}" berhasil diupload`,
      file: {
        url: fileUrl,
        name: filename,
        drive_id: fileId,
      },
    })
  } catch (e: any) {
    console.error('[Rujukan Upload] Error:', e)
    return NextResponse.json({ error: e.message || 'Gagal upload' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE — Hapus surat rujukan
// ═══════════════════════════════════════════════════════════════
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, findingId: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  if (!isSuperAdmin && !HR_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const { id, findingId } = await params

  try {
    const { data: finding } = await supabaseAdmin
      .from('mcu_findings')
      .select('id, jenis_temuan, rujukan_file_name')
      .eq('id', findingId)
      .single()

    if (!finding) return NextResponse.json({ error: 'Temuan tidak ditemukan' }, { status: 404 })

    // Clear kolom rujukan (tidak hapus file dari Drive — biar bisa recovery)
    const { error: updateErr } = await supabaseAdmin
      .from('mcu_findings')
      .update({
        rujukan_file_url: null,
        rujukan_file_name: null,
        rujukan_file_drive_id: null,
        rujukan_uploaded_at: null,
        rujukan_uploaded_by: null,
      })
      .eq('id', findingId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Audit log
    await supabaseAdmin.from('mcu_audit_log').insert({
      mcu_id: id,
      finding_id: findingId,
      action: 'RUJUKAN_DELETED',
      actor_nrp: session.nrp,
      actor_name: session.nama,
      actor_role: role,
      before_data: { filename: finding.rujukan_file_name },
      note: `HR hapus surat rujukan untuk temuan ${finding.jenis_temuan}`,
    })

    return NextResponse.json({ ok: true, message: 'Surat rujukan berhasil dihapus' })
  } catch (e: any) {
    console.error('[Rujukan Delete] Error:', e)
    return NextResponse.json({ error: e.message || 'Gagal hapus' }, { status: 500 })
  }
}