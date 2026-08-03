// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH — CALLBACK
// Google redirect ke sini setelah user consent
// GET /api/auth/google/callback?code=xxx&state=NRP
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { exchangeCodeForTokens, getUserInfo } from '@/app/lib/google-oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // = NRP user
  const errorParam = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Kalau user batalkan consent
  if (errorParam) {
    return NextResponse.redirect(`${appUrl}/dashboard?menu=data_saya&google_error=cancelled`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?menu=data_saya&google_error=invalid`)
  }

  try {
    // 1. Tukar code jadi tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.refresh_token) {
      // Kalau user pernah authorize sebelumnya, Google tidak kasih refresh_token
      // Solusinya: user harus revoke access dulu di myaccount.google.com
      return NextResponse.redirect(
        `${appUrl}/dashboard?menu=data_saya&google_error=no_refresh_token`
      )
    }

    // 2. Ambil info user dari Google
    const userInfo = await getUserInfo(tokens.access_token!)

    // 3. Simpan ke DB
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        google_email: userInfo.email,
        google_refresh_token: tokens.refresh_token,
        google_connected_at: new Date().toISOString(),
      })
      .eq('nrp', state)

    if (error) {
      console.error('Update employee error:', error)
      return NextResponse.redirect(`${appUrl}/dashboard?menu=data_saya&google_error=db_error`)
    }

    // 4. Redirect ke halaman data saya dengan pesan sukses
    return NextResponse.redirect(`${appUrl}/dashboard?menu=data_saya&google_success=1`)
  } catch (err: any) {
    console.error('Google callback error:', err)
    return NextResponse.redirect(
      `${appUrl}/dashboard?menu=data_saya&google_error=${encodeURIComponent(err.message)}`
    )
  }
}