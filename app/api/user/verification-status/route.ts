import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { getVerificationStatus } from '@/app/lib/verification'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const session = auth.session as { nrp?: string }
    const nrp = session?.nrp
    if (!nrp) {
      return NextResponse.json({ error: 'Session NRP tidak ditemukan' }, { status: 401 })
    }

    const status = await getVerificationStatus(nrp)
    return NextResponse.json({ ok: true, ...status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal cek status verifikasi'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}