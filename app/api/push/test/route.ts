// app/api/push/test/route.ts
// Endpoint test — kirim notif ke user yang sedang login
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { notifyUser } from '@/app/lib/web-push'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await notifyUser(session.nrp, {
      title: '🔔 Test Notifikasi',
      body: 'Push notification berhasil! Anda akan menerima notifikasi meeting mulai sekarang.',
      icon: '/icon-192.png',
      url: '/dashboard',
      category: 'TEST'
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}