import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// Hitung jarak antar 2 koordinat (dalam meter)
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

// Tentukan shift berdasarkan waktu clock in
function detectShift(hour: number): 'SIANG' | 'MALAM' {
  if (hour >= 4 && hour < 15) return 'SIANG'
  return 'MALAM'
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
      return NextResponse.json({ error: 'Lokasi GPS wajib diisi. Aktifkan GPS di HP Anda.' }, { status: 400 })
    }

    // ⚡ OFFLINE SYNC: Pakai waktu offline kalau ada
    // Kalau dari offline sync → pakai waktu saat karyawan clock in offline
    // Kalau online biasa → pakai waktu server sekarang
    const clockTime = is_offline_sync && offline_time
      ? new Date(offline_time)
      : new Date()

    // Validasi: waktu offline tidak boleh di masa depan atau > 7 hari yang lalu
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
      return NextResponse.json({ error: 'Site karyawan belum diatur. Hubungi HRGA.' }, { status: 400 })
    }

    // 2. Ambil config site
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

    // 4. Cek apakah sudah clock in di tanggal tersebut
    // ⚡ Pakai tanggal dari clockTime (bukan hari ini)
    const targetDate = clockTime.toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .eq('tanggal', targetDate)
      .single()

    if (existing && existing.clock_in) {
      // Kalau offline sync dan sudah ada clock_in, skip (idempotent)
      if (is_offline_sync) {
        return NextResponse.json({
          success: true,
          message: `⏭️ Clock in tanggal ${targetDate} sudah ada, di-skip`,
          data: existing,
          skipped: true
        })
      }

      return NextResponse.json({
        error: `Anda sudah clock in hari ini pada ${new Date(existing.clock_in).toLocaleTimeString('id-ID')}`
      }, { status: 400 })
    }

    // 5. Detect shift & hitung telat (pakai clockTime, bukan now)
    const jamSekarang = clockTime.getHours()
    const menitSekarang = clockTime.getMinutes()
    const shift = detectShift(jamSekarang)

    let batasJamMasuk: string
    let batasTelatMenit: number

    if (shift === 'SIANG') {
      batasJamMasuk = siteConfig.siang_jam_masuk
      batasTelatMenit = siteConfig.siang_batas_telat || 15
    } else {
      batasJamMasuk = siteConfig.malam_jam_masuk
      batasTelatMenit = siteConfig.malam_batas_telat || 15
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
      const batasSekarangMalam = batasH >= 12 ? batasTotalMenit : batasTotalMenit + 1440
      const sekarangMalam = jamSekarang >= 12 ? sekarangTotalMenit : sekarangTotalMenit + 1440

      if (sekarangMalam > batasSekarangMalam) {
        status = 'TERLAMBAT'
        terlambatMenit = sekarangMalam - (batasH * 60 + batasM + (batasH < 12 ? 1440 : 0))
      }
    }

    // 6. Siapkan keterangan (tandai kalau dari offline sync)
    let keteranganFinal = keterangan || null
    if (is_offline_sync) {
      const syncNote = `[OFFLINE SYNC] Clock in offline pada ${clockTime.toLocaleString('id-ID')}, di-upload ${new Date().toLocaleString('id-ID')}`
      keteranganFinal = keteranganFinal ? `${keteranganFinal} | ${syncNote}` : syncNote
    }

    // 7. Insert atau Update attendance
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

    // Tambah flag offline sync kalau kolom-nya ada di database
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

    const successMsg = is_offline_sync
      ? `✅ Clock In offline berhasil di-sync (${clockTime.toLocaleString('id-ID')}) - ${status}`
      : `✅ Clock In berhasil pada ${clockTime.toLocaleTimeString('id-ID')} (${status})`

    return NextResponse.json({
      success: true,
      message: successMsg,
      data: result,
      is_offline_sync: !!is_offline_sync
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}