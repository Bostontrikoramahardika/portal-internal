// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

// POST → simpan subscription
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { endpoint, keys, device_info } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Data subscription tidak lengkap' }, { status: 400 })
    }

    // Cek apakah endpoint ini sudah tersimpan
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle()

    if (existing) {
      // Update NRP-nya (in case ganti user di device sama)
      await supabase
        .from('push_subscriptions')
        .update({ nrp: session.nrp, device_info: device_info || null })
        .eq('id', existing.id)
    } else {
      // Insert baru
      await supabase.from('push_subscriptions').insert({
        nrp: session.nrp,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        device_info: device_info || null
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE → unsubscribe
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { endpoint } = body

    if (endpoint) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    } else {
      // Hapus semua subs user ini
      await supabase.from('push_subscriptions').delete().eq('nrp', session.nrp)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}