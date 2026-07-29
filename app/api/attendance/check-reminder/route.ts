// app/api/attendance/check-reminder/route.ts
// v2.0 - Chat 30 FINAL: Multi-timezone aware
// - Cek jam pulang berdasarkan timezone SITE user (bukan hardcode WITA)
// - Support WIB/WITA/WIT
// - Dipanggil dari dashboard untuk tampilkan banner reminder clock out

import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { getSiteDate, getSiteHour, Timezone, DEFAULT_TIMEZONE } from '@/app/lib/timezone'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Ambil data karyawan (untuk tau site)
    const { data: emp } = await supabase
      .from('employees')
      .select('site')
      .eq('nrp', session.nrp)
      .single()

    if (!emp?.site) {
      return NextResponse.json({ show_reminder: false })
    }

    // 2. Ambil config site (WAJIB include timezone)
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('siang_jam_pulang, malam_jam_pulang, timezone')
      .eq('nama_site', emp.site)
      .eq('active', true)
      .single()

    if (!siteConfig) {
      return NextResponse.json({ show_reminder: false })
    }

    // ⭐ CHAT 30: Timezone site user (fallback WITA)
    const siteTz: Timezone = (siteConfig.timezone || DEFAULT_TIMEZONE) as Timezone

    // ⭐ CHAT 30: Today & hour di TIMEZONE SITE
    const today = getSiteDate(null, siteTz)
    const currentHour = getSiteHour(null, siteTz)

    // 3. Cek attendance hari ini (berdasarkan tanggal site)
    const { data: todayAtt } = await supabase
      .from('attendance')
      .select('id, clock_in, clock_out, shift, status, tanggal')
      .eq('nrp', session.nrp)
      .eq('tanggal', today)
      .maybeSingle()

    // Tidak ada attendance hari ini = tidak perlu reminder
    if (!todayAtt || !todayAtt.clock_in) {
      return NextResponse.json({ show_reminder: false })
    }

    // Sudah clock out
    if (todayAtt.clock_out) {
      // Cek: apakah statusnya TIDAK CLOCK OUT (auto clock out)?
      if (todayAtt.status === 'TIDAK CLOCK OUT') {
        return NextResponse.json({
          show_reminder: true,
          type: 'auto_clockout_notice',
          message: 'Anda kemarin tidak clock out manual. Sistem sudah auto clock out.',
          tanggal: todayAtt.tanggal,
          severity: 'warning'
        })
      }
      return NextResponse.json({ show_reminder: false })
    }

    // ── Belum clock out → cek apakah sudah lewat jam pulang ──
    // Tentukan jam pulang berdasarkan shift
    const shift = todayAtt.shift || 'SIANG'
    let jamPulang: string
    if (shift === 'SIANG') {
      jamPulang = siteConfig.siang_jam_pulang || '17:00:00'
    } else {
      jamPulang = siteConfig.malam_jam_pulang || '05:00:00'
    }

    const [pulangH] = jamPulang.split(':').map(Number)

    // Cek apakah sudah lewat jam pulang (jam di timezone SITE)
    let sudahLewatJamPulang = false
    if (shift === 'SIANG') {
      // Shift siang: pulang jam 17:00 → lewat kalau jam >= 17
      sudahLewatJamPulang = currentHour >= pulangH
    } else {
      // Shift malam: jam pulang 05:00 → lewat kalau jam 05-17 (belum shift lagi)
      sudahLewatJamPulang = currentHour >= pulangH && currentHour < 17
    }

    if (!sudahLewatJamPulang) {
      return NextResponse.json({ show_reminder: false })
    }

    // ── Sudah lewat jam pulang dan belum clock out → tampilkan reminder ──
    const lewatJam = currentHour - pulangH
    let severity: 'warning' | 'danger' = 'warning'
    let message = `⚠️ Anda belum Clock Out! Jam pulang shift ${shift} adalah ${jamPulang.slice(0, 5)}.`

    if (lewatJam >= 1) {
      severity = 'danger'
      message = `🚨 Anda sudah ${lewatJam} jam melewati jam pulang! Segera Clock Out sebelum sistem auto clock out.`
    }

    return NextResponse.json({
      show_reminder: true,
      type: 'no_clockout',
      message,
      shift,
      jam_pulang: jamPulang.slice(0, 5),
      lewat_jam: lewatJam,
      severity,
      site_timezone: siteTz
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}