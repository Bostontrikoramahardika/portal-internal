import { NextRequest, NextResponse } from 'next/server'
import { loginByNrp } from '@/app/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { nrp } = await request.json()

    if (!nrp || !String(nrp).trim()) {
      return NextResponse.json({ error: 'NRP wajib diisi' }, { status: 400 })
    }

    const session = await loginByNrp(String(nrp).trim())

    const response = NextResponse.json({ success: true, user: session })
    response.cookies.set('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 jam
      path: '/'
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 })
  }
}