import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { incrementSkipCount } from '@/app/lib/verification'

export async function POST(req: NextRequest) {
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

    const result = await incrementSkipCount(nrp)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal skip verifikasi'
    const status = message.includes('maksimal') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}