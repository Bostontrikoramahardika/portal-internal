import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { saveContact } from '@/app/lib/verification'

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

    const body = await req.json()

    const result = await saveContact({
      nrp,
      email: body?.email,
      noHp: body?.no_hp ?? body?.noHp,
    })

    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal simpan kontak'
    const status = message.includes('tidak valid') || message.includes('wajib') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}