import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const session = await getSession(token)
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  return NextResponse.json({ user: session })
}