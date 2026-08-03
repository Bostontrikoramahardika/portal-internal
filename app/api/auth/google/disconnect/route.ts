// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH — DISCONNECT
// POST /api/auth/google/disconnect → putuskan koneksi Google
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { revokeToken } from '@/app/lib/google-oauth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    // Ambil refresh token yang tersimpan
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('google_refresh_token')
      .eq('nrp', session.nrp)
      .single()

    // Revoke di Google (silent fail kalau gagal)
    if (emp?.google_refresh_token) {
      await revokeToken(emp.google_refresh_token)
    }

    // Hapus dari DB
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        google_email: null,
        google_refresh_token: null,
        google_connected_at: null,
      })
      .eq('nrp', session.nrp)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: '✅ Akun Google berhasil diputus' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}