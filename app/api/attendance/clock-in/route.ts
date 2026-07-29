// app/api/attendance/clock-in/route.ts
// v4.0 - Chat 30 FINAL: Multi-timezone support (WIB/WITA/WIT)
// - Store UTC, detect shift & tanggal dari timezone SITE
// - Backward compatible dengan offline sync
// - Zero manual offset math (pakai Intl API)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { 
  getSiteDate, 
  getSiteHour, 
  getSiteMinute, 
  detectShiftFromClockIn,
  formatSiteTime,
  Timezone
} from '@/app/lib/timezone'

// Hitung jarak antar 2 koordinat (dalam meter) - Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    const body = await request.json()
    const { latitude, longitude, keterangan, offline_time, is_offline_sync } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ 
        error: 'Lokasi GPS wajib diisi. Aktifkan GPS di HP Anda.' 
      }, { status: 400 })
    }

    // 🎯 CRITICAL: clockTime SELALU UTC
    // Node.js Date() default UTC, offline_time dari client kirim ISO string (UTC)
    const clockTime = is_offline_sync && offline_time
      ? new Date(offline_time)
      : new Date()

    // Validasi waktu offline
    if (is_offline_sync) {
      const now = new Date()
      const diffMs = now.getTime() - clockTime.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (diffMs < 0) {
        return NextResponse.json({
          error: 'Waktu offline tidak valid (masa depan)'
        }, { status: 400 })
      }

      if (diffDays > 7) {
        return NextResponse.json({
          error: 'Data offline terlalu lama (> 7 hari). Hubungi HRGA.'
        }, { status: 400 })
      }
    }

    // 1. Ambil data karyawan
    const { data: emp } = await supabase
      .from('employees')
      .select('site, nama')
      .eq('nrp', session.nrp)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'Data karyawan tidak ditemukan' }, { status: 404 })
    }

    if (!emp.site) {
      return NextResponse.json({ 
        error: 'Site karyawan belum diatur. Hubungi HRGA.' 
      }, { status: 400 })
    }

    // 2. Ambil config site (WAJIB include timezone)
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('*')
      .eq('nama_site', emp.site)
      .eq('active', true)
      .single()

    if (!siteConfig) {
      return NextResponse.json({
        error: `Setting site "${emp.site}" belum ada. Hubungi HRGA untuk setup.`
      }, { status: 400 })
    }

    // ⭐ CHAT 30: Timezone site (dari sites_config, fallback Asia/Makassar)
    const siteTz: Timezone = (siteConfig.timezone || 'Asia/Makassar') as Timezone

    // 3. Validasi jarak GPS
    if (siteConfig.latitude && siteConfig.longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        Number(siteConfig.latitude),
        Number(siteConfig.longitude)
      )

      if (distance > siteConfig.radius_meter) {
        return NextResponse.json({
          error: `Anda berada ${Math.round(distance)}m dari site ${emp.site}. Harus di dalam radius ${siteConfig.radius_meter}m.`
        }, { status: 400 })
      }
    }

    // 4. ⭐ CHAT 30: Deteksi shift & tanggal BERDASARKAN TIMEZONE SITE
    const shift = detectShiftFromClockIn(clockTime, siteTz)
    const targetDate = getSiteDate(clockTime, siteTz)

    // Jam & menit di timezone site (untuk hitung telat)
    const jamSekarang = getSiteHour(clockTime, siteTz)
    const menitSekarang = getSiteMinute(clockTime, siteTz)

    // 5. Cek apakah sudah clock in di tanggal SHIFT tersebut
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .eq('tanggal', targetDate)
      .eq('shift', shift)
      .maybeSingle()

    if (existing && existing.clock_in) {
      if (is_offline_sync) {
        return NextResponse.json({
          success: true,
          message: `⏭️ Clock in tanggal ${targetDate} sudah ada, di-skip`,
          data: existing,
          skipped: true
        })
      }

      const jamExisting = formatSiteTime(existing.clock_in, siteTz)
      return NextResponse.json({
        error: `Anda sudah clock in shift ${shift} tanggal ${targetDate} pada ${jamExisting}`
      }, { status: 400 })
    }

    // 6. Hitung status & terlambat
    let batasJamMasuk: string
    let batasTelatMenit: number

    if (shift === 'SIANG') {
      batasJamMasuk = siteConfig.siang_jam_masuk || "06:00"
      batasTelatMenit = Number(siteConfig.siang_batas_telat) || 0
    } else {
      batasJamMasuk = siteConfig.malam_jam_masuk || "18:00"
      batasTelatMenit = Number(siteConfig.malam_batas_telat) || 0
    }

    const [batasH, batasM] = batasJamMasuk.split(':').map(Number)
    const batasTotalMenit = batasH * 60 + batasM + batasTelatMenit
    const sekarangTotalMenit = jamSekarang * 60 + menitSekarang

    let status = 'HADIR'
    let terlambatMenit = 0

    if (shift === 'SIANG') {
      if (sekarangTotalMenit > batasTotalMenit) {
        status = 'TERLAMBAT'
        terlambatMenit = sekarangTotalMenit - (batasH * 60 + batasM)
      }
    } else {
      // Shift malam: handle lintas hari
      const batasSekarangMalam = batasH >= 12 ? batasTotalMenit : batasTotalMenit + 1440
      const sekarangMalam = jamSekarang >= 12 ? sekarangTotalMenit : sekarangTotalMenit + 1440

      if (sekarangMalam > batasSekarangMalam) {
        status = 'TERLAMBAT'
        terlambatMenit = sekarangMalam - (batasH * 60 + batasM + (batasH < 12 ? 1440 : 0))
      }
    }

    // 7. Siapkan keterangan
    let keteranganFinal = keterangan || null
    if (is_offline_sync) {
      const jamOffline = formatSiteTime(clockTime, siteTz)
      const jamSync = formatSiteTime(new Date(), siteTz)
      const syncNote = `[OFFLINE SYNC] Absen offline: ${targetDate} ${jamOffline} ${siteTz}, sync: ${jamSync}`
      keteranganFinal = keteranganFinal ? `${keteranganFinal} | ${syncNote}` : syncNote
    }

    // 8. Insert atau Update attendance
    // ⭐ CRITICAL: SIMPAN clockTime.toISOString() (SELALU UTC)
    const attendanceData: any = {
      nrp: session.nrp,
      tanggal: targetDate,
      shift,
      clock_in: clockTime.toISOString(),
      clock_in_lat: latitude,
      clock_in_lng: longitude,
      clock_in_lokasi: `${latitude}, ${longitude}`,
      status,
      terlambat_menit: terlambatMenit,
      site: emp.site,
      keterangan: keteranganFinal,
      updated_at: new Date().toISOString()
    }

    if (is_offline_sync) {
      attendanceData.is_offline_sync = true
      attendanceData.synced_at = new Date().toISOString()
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('attendance')
        .update(attendanceData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    } else {
      const { data, error } = await supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    }

    // 9. Response
    const jamDisplay = formatSiteTime(clockTime, siteTz)
    const successMsg = is_offline_sync
      ? `✅ Clock In offline berhasil di-sync (${targetDate} ${jamDisplay}) - ${status}`
      : `✅ Clock In berhasil pada ${jamDisplay} (${status})`

    return NextResponse.json({
      success: true,
      message: successMsg,
      data: result,
      is_offline_sync: !!is_offline_sync,
      shift_info: {
        shift,
        shift_date: targetDate,
        site_timezone: siteTz,
        clock_hour: jamSekarang,
        clock_display: jamDisplay
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}