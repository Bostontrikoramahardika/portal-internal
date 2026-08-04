// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH — CONNECT
// GET /api/auth/google/connect → redirect ke Google consent screen
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { generateAuthUrl } from '@/app/lib/google-oauth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    // ═══ GUARD: Cek apakah user sudah diizinkan admin untuk connect Google ═══
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('google_access_enabled')
      .eq('nrp', session.nrp)
      .single()

    if (!emp?.google_access_enabled) {
      // Redirect balik ke Data Saya dengan pesan error
      const url = new URL('/dashboard?menu=data_saya', request.url)
      url.searchParams.set('google_error', 'not_allowed')
      return NextResponse.redirect(url)
    }

    // State = NRP user, untuk identifikasi di callback
    const authUrl = generateAuthUrl(session.nrp)
    return NextResponse.redirect(authUrl)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}