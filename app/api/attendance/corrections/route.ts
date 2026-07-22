import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import {
  createCorrectionRequest,
  extractSessionNrp,
  getRolesForSession,
  listCorrections,
} from '@/app/lib/attendance-corrections'

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url)

    const view = searchParams.get('view') === 'approval' ? 'approval' : 'my'
    const status = searchParams.get('status') || undefined
    const limit = Number(searchParams.get('limit') || 50)

    const data = await listCorrections({
      viewerNrp,
      viewerRoles,
      isSuperAdmin: Boolean(session?.is_super_admin),
      view,
      status,
      limit,
    })

    return NextResponse.json({ ok: true, ...data })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Gagal mengambil koreksi absensi',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const session = auth.session as Record<string, unknown>
    const employeeNrp = extractSessionNrp(session)
    if (!employeeNrp) {
      return NextResponse.json(
        { error: 'Session NRP tidak ditemukan' },
        { status: 401 }
      )
    }

    const roles = await getRolesForSession(session)
    const body = await req.json()

    const data = await createCorrectionRequest({
      employeeNrp,
      tanggal: String(body?.tanggal || ''),
      tipe: String(body?.tipe || '') as 'LUPA_CLOCK_IN' | 'LUPA_CLOCK_OUT' | 'KOREKSI_JAM',
      requestedClockIn: body?.requested_clock_in ?? body?.clock_in ?? null,
      requestedClockOut: body?.requested_clock_out ?? body?.clock_out ?? null,
      requestedShift: body?.requested_shift ?? body?.shift ?? null,
      alasan: String(body?.alasan || ''),
      buktiUrl: body?.bukti_url ?? null,
      sessionRoles: roles,
      sessionScopeSite:
        typeof session?.scope_site === 'string' ? session.scope_site : null,
      sessionIsSuperAdmin: Boolean(session?.is_super_admin),
    })

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gagal membuat koreksi absensi'

    const status =
      message.includes('wajib') ||
      message.includes('tidak valid') ||
      message.includes('Format') ||
      message.includes('Masih ada pengajuan pending')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}