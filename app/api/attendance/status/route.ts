// app/api/attendance/status/route.ts
// v6.4 FINAL - Fix shift malam sudah clock-out tetap tampil SHIFT SELESAI (< jam 12)
// - Store UTC, detect via timezone SITE (dari sites_config)
// - Compatible dengan library timezone yang ada (getSiteDate, getSiteHour, formatSiteTime)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase, supabaseAdmin } from '@/app/lib/supabase'
import {
  getSiteDate,
  getSiteHour,
  formatSiteTime,
  Timezone,
} from '@/app/lib/timezone'

type AttendanceRecord = {
  id: string
  nrp: string
  tanggal: string
  shift: string
  clock_in: string | null
  clock_out: string | null
  [key: string]: any
}

export async function GET(request: NextRequest) {
  // ─── 1. Auth ────────────────────────────────────────────────────────────
  const token = request.cookies.get('session_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await getSession(token)
  if (!session) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  const nrp = session.nrp
  if (!nrp) {
    return NextResponse.json({ error: 'NRP tidak ditemukan' }, { status: 400 })
  }

  try {
    // ─── 2. Ambil site karyawan ──────────────────────────────────────────
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('site')
      .eq('nrp', nrp)
      .single()

    const site = employee?.site || 'PPA-MLP'

    // ─── 3. Ambil timezone dari sites_config ─────────────────────────────
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('timezone')
      .eq('site', site)
      .single()

    const siteTz: Timezone = (siteConfig?.timezone || 'Asia/Makassar') as Timezone

    // ─── 4. Hitung tanggal today/yesterday di TZ site ────────────────────
    const now = new Date()
    const today = getSiteDate(now, siteTz)
    const currentHour = getSiteHour(now, siteTz)

    // Hitung yesterday: kurangi 1 hari dari today (YYYY-MM-DD)
    const todayObj = new Date(`${today}T00:00:00Z`)
    todayObj.setUTCDate(todayObj.getUTCDate() - 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    const yesterday = `${todayObj.getUTCFullYear()}-${pad(
      todayObj.getUTCMonth() + 1
    )}-${pad(todayObj.getUTCDate())}`

    // ─── 5. Ambil record attendance today + yesterday ────────────────────
    const { data: records, error } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('nrp', nrp)
      .in('tanggal', [today, yesterday])
      .order('clock_in', { ascending: false })

    if (error) {
      console.error('[status/route.ts] DB error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const typedRecords: AttendanceRecord[] = (records || []) as AttendanceRecord[]
    let todayAttendance: AttendanceRecord | null = null

    // ─── Step 1: Cari record HARI INI ────────────────────────────────────
    // (shift SIANG hari ini, atau MALAM yang clock-in hari ini)
    const todayRecord = typedRecords.find(
      (r: AttendanceRecord) => r.tanggal === today && r.clock_in
    )

    if (todayRecord) {
      todayAttendance = todayRecord
    }
    // ─── Step 2: Cari record KEMARIN shift MALAM (< jam 12) ──────────────
    // v6.0 FIX: tampilkan APAPUN status clock_out-nya
    //   - clock_out = null  → UI tampil tombol "CLOCK OUT"
    //   - clock_out = ada   → UI tampil "SHIFT SELESAI"
    // v5.0 BUG: hanya return kalau clock_out=null → sudah clock-out → today=null → UI tampil "CLOCK IN" (SALAH)
    else if (currentHour < 12) {
      const yesterdayMalam = typedRecords.find(
        (r: AttendanceRecord) =>
          r.tanggal === yesterday && r.shift === 'MALAM' && r.clock_in
      )
      if (yesterdayMalam) {
        todayAttendance = yesterdayMalam
      }
    }

    // ─── 6. Format jam untuk display (opsional, kalau frontend butuh) ────
    let clockInDisplay: string | null = null
    let clockOutDisplay: string | null = null
    if (todayAttendance?.clock_in) {
      clockInDisplay = formatSiteTime(todayAttendance.clock_in, siteTz)
    }
    if (todayAttendance?.clock_out) {
      clockOutDisplay = formatSiteTime(todayAttendance.clock_out, siteTz)
    }

    // ─── 7. Return response ──────────────────────────────────────────────
    return NextResponse.json({
      today: todayAttendance,
      currentTime: now.toISOString(),
      timezone: siteTz,
      clockInDisplay,
      clockOutDisplay,
      debug: {
        nrp,
        site,
        today,
        yesterday,
        currentHour,
        recordsFound: typedRecords.length,
        source: todayAttendance
          ? todayAttendance.tanggal === today
            ? 'today'
            : 'yesterday-malam'
          : 'none',
      },
    })
  } catch (err) {
    console.error('[status/route.ts] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}