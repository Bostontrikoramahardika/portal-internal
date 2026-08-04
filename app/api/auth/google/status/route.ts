// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH — STATUS
// GET /api/auth/google/status → cek user sudah connect atau belum
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('google_email, google_connected_at, google_access_enabled')
    .eq('nrp', session.nrp)
    .single()

  return NextResponse.json({
    connected: Boolean(emp?.google_email),
    google_email: emp?.google_email || null,
    connected_at: emp?.google_connected_at || null,
    access_enabled: Boolean(emp?.google_access_enabled),  // ═══ BARU
  })
}