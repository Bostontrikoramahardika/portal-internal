import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import {
  extractSessionNrp,
  getRolesForSession,
  overrideCorrectionRequest,
} from '@/app/lib/attendance-corrections'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const session = auth.session as Record<string, unknown>
    const actorNrp = extractSessionNrp(session)
    if (!actorNrp) {
      return NextResponse.json(
        { error: 'Session NRP tidak ditemukan' },
        { status: 401 }
      )
    }

    const actorRoles = await getRolesForSession(session)
    const body = await req.json()

    const data = await overrideCorrectionRequest({
      actorNrp,
      actorRoles,
      actorIsSuperAdmin: Boolean(session?.is_super_admin),
      employeeNrp: String(body?.employee_nrp || ''),
      tanggal: String(body?.tanggal || ''),
      tipe: String(body?.tipe || '') as 'LUPA_CLOCK_IN' | 'LUPA_CLOCK_OUT' | 'KOREKSI_JAM',
      requestedClockIn: body?.requested_clock_in ?? body?.clock_in ?? null,
      requestedClockOut: body?.requested_clock_out ?? body?.clock_out ?? null,
      requestedShift: body?.requested_shift ?? body?.shift ?? null,
      alasan: String(body?.alasan || ''),
      buktiUrl: body?.bukti_url ?? null,
      approvalNote: body?.approval_note ?? body?.catatan ?? null,
    })

    return NextResponse.json({ ok: true, ...data }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gagal override koreksi absensi'

    const status =
      message.includes('Hanya HR') || message.includes('tidak berhak')
        ? 403
        : message.includes('wajib') ||
          message.includes('Format') ||
          message.includes('tidak valid') ||
          message.includes('tidak ditemukan')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}