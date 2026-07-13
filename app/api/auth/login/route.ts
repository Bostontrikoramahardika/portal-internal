import { NextRequest, NextResponse } from 'next/server'
import { loginByNrp } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { nrp, password, site } = await request.json()

    // Validasi input
    if (!nrp || !String(nrp).trim()) {
      return NextResponse.json({ error: 'NRP wajib diisi' }, { status: 400 })
    }
    if (!password || !String(password).trim()) {
      return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 })
    }

    // Cek password ke database dulu
    const nrpStr = String(nrp).trim()
    const { data: employee } = await supabase
      .from('employees')
      .select('nrp, nama, password, site')
      .or(`nrp.eq.${nrpStr},nrp_login.eq.${nrpStr}`)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'NRP tidak terdaftar' }, { status: 401 })
    }

    // Validasi password (bandingkan dengan yang di database)
    if (String(employee.password).trim() !== String(password).trim()) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    // Password benar → lanjut buat session
    const session = await loginByNrp(nrpStr)

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
    return NextResponse.json({ error: err.message || 'Login gagal' }, { status: 401 })
  }
}