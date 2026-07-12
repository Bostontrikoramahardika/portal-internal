import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { note } = await request.json()

    const { error } = await supabase
      .from('data_change_requests')
      .insert({
        nrp: session.nrp,
        data_baru: { catatan: note }, // Disimpan sebagai JSON
        status: 'pending'
      })

    if (error) throw error

    return NextResponse.json({ message: 'Request sent' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}