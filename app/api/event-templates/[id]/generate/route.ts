// app/api/event-templates/[id]/generate/route.ts
// POST → Generate events untuk bulan tertentu berdasarkan template
// Body: { year: 2026, month: 9 }

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase, supabaseAdmin } from '@/app/lib/supabase'
import crypto from 'crypto'

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

/**
 * Generate semua tanggal dalam bulan yang match dengan recurring_days
 * @param year 2026
 * @param month 9 (1-12)
 * @param recurringDays [0,1] = Min & Sen
 */
function generateDatesInMonth(
  year: number,
  month: number,
  recurringDays: number[]
): string[] {
  const dates: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dayOfWeek = date.getDay() // 0=Min, 1=Sen, ..., 6=Sab

    if (recurringDays.includes(dayOfWeek)) {
      const yyyy = year.toString()
      const mm = String(month).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      dates.push(`${yyyy}-${mm}-${dd}`)
    }
  }

  return dates
}

// ═══ POST — Generate events ═══
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id: templateId } = await params
    const body = await request.json()
    const { year, month } = body

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ 
        error: 'year & month (1-12) wajib' 
      }, { status: 400 })
    }

    // ─── Ambil template ───
    const { data: template, error: tmplErr } = await supabaseAdmin
      .from('event_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (tmplErr || !template) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })
    }

    if (!template.active) {
      return NextResponse.json({ error: 'Template tidak aktif' }, { status: 400 })
    }

    // ─── Generate tanggal ───
    const dates = generateDatesInMonth(year, month, template.recurring_days)

    if (dates.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Tidak ada tanggal yang match untuk bulan ${month}/${year}`
      })
    }

    // ─── Cek existing events (biar tidak dobel-generate) ───
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

    const { data: existingEvents } = await supabaseAdmin
      .from('events')
      .select('tanggal')
      .eq('template_id', templateId)
      .gte('tanggal', startOfMonth)
      .lte('tanggal', endOfMonth)

    const existingDates = new Set((existingEvents || []).map((e: any) => e.tanggal))
    const newDates = dates.filter(d => !existingDates.has(d))

    if (newDates.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Semua ${dates.length} tanggal sudah pernah di-generate untuk bulan ini`,
        skipped: dates.length,
        inserted: 0
      })
    }

    // ─── Insert events (status = DRAFT) ───
    const insertRows = newDates.map(tanggal => ({
      nama_event: template.nama,
      deskripsi: template.deskripsi,
      tipe: template.tipe,
      tanggal,
      jam_mulai: template.default_jam_mulai,
      jam_selesai: template.default_jam_selesai,
      lokasi: template.default_lokasi,
      site: template.default_site,
      qr_location_id: template.default_qr_location_id,
      qr_token: crypto.randomBytes(12).toString('base64url').substring(0, 16),
      template_id: templateId,
      auto_generated: true,
      status: 'DRAFT',
      created_by: session.nrp,
      created_by_nama: session.nama
    }))

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('events')
      .insert(insertRows)
      .select()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: `✅ ${newDates.length} events berhasil di-generate`,
      inserted: newDates.length,
      skipped: dates.length - newDates.length,
      dates: newDates
    })
  } catch (err: any) {
    console.error('Generate events error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}