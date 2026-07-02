import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/app/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value

  if (token) {
    await logout(token)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('session_token')

  return response
}