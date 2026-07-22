import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import {
  approveCorrectionRequest,
  extractSessionNrp,
  getCorrectionDetail,
  getRolesForSession,
  rejectCorrectionRequest,
} from '@/app/lib/attendance-corrections'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const session = auth.session as Record<string, unknown>
    const viewerNrp = extractSessionNrp(session)
    if (!viewerNrp) {
      return NextResponse.json(
        { error: 'Session NRP tidak ditemukan' },
        { status: 401 }
      )
    }

    const viewerRoles = await getRolesForSession(session)
    const { id } = await context.params

    const data = await getCorrectionDetail({
      correctionId: id,
      viewerNrp,
      viewerRoles,
      isSuperAdmin: Boolean(session?.is_super_admin),
    })

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gagal mengambil detail koreksi'

    const status =
      message.includes('tidak ditemukan')
        ? 404
        : message.includes('akses')
        ? 403
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const session = auth.session as Record<string, unknown>
    const approverNrp = extractSessionNrp(session)
    if (!approverNrp) {
      return NextResponse.json(
        { error: 'Session NRP tidak ditemukan' },
        { status: 401 }
      )
    }

    const approverRoles = await getRolesForSession(session)
    const body = await req.json()
    const action = String(body?.action || '').toUpperCase()
    const approvalNote =
      body?.approval_note ?? body?.catatan ?? body?.note ?? null

    const { id } = await context.params

    if (action === 'APPROVE') {
      const data = await approveCorrectionRequest({
        correctionId: id,
        approverNrp,
        approverRoles,
        approvalNote,
        isSuperAdmin: Boolean(session?.is_super_admin),
      })

      return NextResponse.json({ ok: true, action, ...data })
    }

    if (action === 'REJECT') {
      const data = await rejectCorrectionRequest({
        correctionId: id,
        approverNrp,
        approverRoles,
        approvalNote,
        isSuperAdmin: Boolean(session?.is_super_admin),
      })

      return NextResponse.json({ ok: true, action, data })
    }

    return NextResponse.json(
      { error: 'Action harus APPROVE atau REJECT' },
      { status: 400 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gagal memproses approval koreksi'

    const status =
      message.includes('tidak ditemukan')
        ? 404
        : message.includes('tidak berhak') || message.includes('akses')
        ? 403
        : message.includes('sudah diproses')
        ? 409
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}