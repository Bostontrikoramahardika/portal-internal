import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    const body = await request.json()
    const { new_nrp_login } = body

    const cleanNrp = String(new_nrp_login || '').trim()

    if (!cleanNrp) {
      return NextResponse.json({ error: 'NRP login baru wajib diisi' }, { status: 400 })
    }

    if (cleanNrp.length < 3) {
      return NextResponse.json({ error: 'NRP login minimal 3 karakter' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('employees')
      .select('nrp')
      .eq('nrp_login', cleanNrp)
      .neq('nrp', session.nrp)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'NRP login ini sudah dipakai orang lain' }, { status: 400 })
    }

    const { error } = await supabase
      .from('employees')
      .update({ nrp_login: cleanNrp })
      .eq('nrp', session.nrp)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: `✅ NRP Login berhasil diubah menjadi ${cleanNrp}. Silakan logout dan login ulang.`
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}