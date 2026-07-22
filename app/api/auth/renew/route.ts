// app/api/auth/renew/route.ts
// Endpoint untuk renew cookie saat token masih valid
// Dipakai khusus untuk iPhone PWA yang cookie-nya hilang

import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Validasi token (dari header Authorization atau cookie)
    const session = await getSessionFromRequest(req)

    if (!session) {
      return NextResponse.json({ error: 'Token tidak valid atau sudah expired' }, { status: 401 })
    }

    // Token masih valid → set ulang cookie dengan expiry baru
    const response = NextResponse.json({
      ok: true,
      message: 'Cookie renewed',
      nrp: session.nrp
    })

    response.cookies.set('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      path: '/'
    })

    console.log(`🔄 Session renewed for NRP: ${session.nrp}`)
    return response

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Renew gagal' }, { status: 500 })
  }
}