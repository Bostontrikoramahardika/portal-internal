// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH HELPER
// Membuat OAuth2 client & scopes management
// ═══════════════════════════════════════════════════════════════════════════

import { google } from 'googleapis'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/gmail.send',
]

/**
 * Buat OAuth2 client untuk Google API
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth env vars belum di-set')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Buat OAuth2 client dari refresh token user
 * Dipakai saat mau akses Calendar/Tasks/Gmail atas nama user
 */
export function createOAuth2ClientWithToken(refreshToken: string) {
  const client = createOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

/**
 * Generate URL OAuth consent
 */
export function generateAuthUrl(state?: string): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state: state || '',
  })
}

/**
 * Tukar authorization code jadi tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

/**
 * Ambil info user (email, nama) dari access token
 */
export async function getUserInfo(accessToken: string) {
  const client = createOAuth2Client()
  client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data } = await oauth2.userinfo.get()

  return {
    email: data.email || '',
    name: data.name || '',
    picture: data.picture || '',
  }
}

/**
 * Revoke token di Google (saat disconnect)
 */
export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    const client = createOAuth2Client()
    await client.revokeToken(refreshToken)
  } catch (err) {
    console.error('Revoke token error:', err)
    // Silent fail — user tetap bisa disconnect di DB kita
  }
}