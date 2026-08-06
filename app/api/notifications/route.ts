// app/api/notifications/route.ts
// GET  → list notif user (dengan pagination)
// PATCH → mark as read (single/all)
// DELETE → hapus notif

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const unreadOnly = url.searchParams.get('unread') === '1'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('nrp', session.nrp)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) query = query.is('read_at', null)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Count unread
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('nrp', session.nrp)
      .is('read_at', null)

    return NextResponse.json({
      success: true,
      notifications: data || [],
      unread_count: count || 0
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, all } = body

    if (all) {
      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('nrp', session.nrp)
        .is('read_at', null)
    } else if (id) {
      // Mark single
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('nrp', session.nrp)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const all = url.searchParams.get('all') === '1'

    if (all) {
      await supabase.from('notifications').delete().eq('nrp', session.nrp)
    } else if (id) {
      await supabase.from('notifications').delete().eq('id', id).eq('nrp', session.nrp)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}