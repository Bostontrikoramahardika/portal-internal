// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH — CONNECT
// GET /api/auth/google/connect → redirect ke Google consent screen
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { generateAuthUrl } from '@/app/lib/google-oauth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    // State = NRP user, untuk identifikasi di callback
    const authUrl = generateAuthUrl(session.nrp)
    return NextResponse.redirect(authUrl)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}