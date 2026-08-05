// app/api/event-templates/route.ts
// GET  → List template meeting recurring
// POST → Buat template baru

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

function canManage(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    ['she_site', 'spv_she_ho', 'pjo_site', 'pjo',
     'hr_ho', 'hrga', 'hrga_pusat', 'hr_site', 'hrga_site',
     'admin', 'admin_site', 'admin_plant',
     'gl_produksi', 'gl_plant',
     'director_ops', 'manager_ops', 'business_dev'].includes(r)
  )
}

// ═══ GET — List templates ═══
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const site = searchParams.get('site') || ''

    let query = supabase
      .from('event_templates')
      .select('*')
      .eq('active', true)
      .order('nama')

    if (site) query = query.eq('default_site', site)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══ POST — Buat template baru ═══
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const {
      nama,
      deskripsi,
      tipe,
      recurring_days,
      default_jam_mulai,
      default_jam_selesai,
      default_lokasi,
      default_site,
      default_qr_location_id,
      reminder_h_minus
    } = body

    if (!nama || !Array.isArray(recurring_days) || recurring_days.length === 0) {
      return NextResponse.json({ 
        error: 'nama & recurring_days (minimal 1 hari) wajib' 
      }, { status: 400 })
    }

    // Validasi recurring_days (0-6)
    const validDays = recurring_days.every((d: number) => d >= 0 && d <= 6)
    if (!validDays) {
      return NextResponse.json({ error: 'recurring_days harus 0-6' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('event_templates')
      .insert({
        nama: String(nama).trim(),
        deskripsi: deskripsi || null,
        tipe: tipe || 'MEETING',
        recurring_days,
        default_jam_mulai: default_jam_mulai || null,
        default_jam_selesai: default_jam_selesai || null,
        default_lokasi: default_lokasi || null,
        default_site: default_site || session.scope_site || session.site || null,
        default_qr_location_id: default_qr_location_id || null,
        reminder_h_minus: reminder_h_minus ?? 2,
        active: true,
        created_by: session.nrp,
        created_by_nama: session.nama
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: '✅ Template berhasil dibuat',
      data
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}