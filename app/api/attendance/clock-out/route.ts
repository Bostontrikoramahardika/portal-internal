import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

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
      return NextResponse.json({ error: 'Lokasi GPS wajib diisi.' }, { status: 400 })
    }

    // ⚡ OFFLINE SYNC: Pakai waktu offline kalau ada
    const clockTime = is_offline_sync && offline_time
      ? new Date(offline_time)
      : new Date()

    // Validasi waktu offline
    if (is_offline_sync) {
      const now = new Date()
      const diffMs = now.getTime() - clockTime.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (diffMs < 0) {
        return NextResponse.json({ error: 'Waktu offline tidak valid (masa depan)' }, { status: 400 })
      }

      if (diffDays > 7) {
        return NextResponse.json({ error: 'Data offline terlalu lama (> 7 hari).' }, { status: 400 })
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

    // 2. Ambil config site (validasi GPS)
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('*')
      .eq('nama_site', emp.site)
      .eq('active', true)
      .single()

    // 3. Validasi jarak GPS
    if (siteConfig && siteConfig.latitude && siteConfig.longitude) {
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

    // 4. Cari attendance tanggal tersebut (WITA UTC+8)
    const witaClockTime = new Date(clockTime.getTime() + 8 * 60 * 60 * 1000)
    const targetDate = witaClockTime.toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .eq('tanggal', targetDate)
      .single()

    if (!existing) {
      return NextResponse.json({
        error: `Belum ada clock in di tanggal ${targetDate}. Harus clock in dulu.`
      }, { status: 400 })
    }

    if (!existing.clock_in) {
      return NextResponse.json({
        error: `Belum clock in di tanggal ${targetDate}.`
      }, { status: 400 })
    }

    if (existing.clock_out) {
      // Kalau offline sync dan sudah ada clock_out, skip
      if (is_offline_sync) {
        return NextResponse.json({
          success: true,
          message: `⏭️ Clock out tanggal ${targetDate} sudah ada, di-skip`,
          data: existing,
          skipped: true
        })
      }

      return NextResponse.json({
        error: `Sudah clock out pada ${new Date(existing.clock_out).toLocaleTimeString('id-ID')}`
      }, { status: 400 })
    }

    // 5. Hitung total jam kerja
    const clockInTime = new Date(existing.clock_in)
    const diffMs = clockTime.getTime() - clockInTime.getTime()
    const jamKerjaMenit = Math.floor(diffMs / (1000 * 60))

    if (jamKerjaMenit < 0) {
      return NextResponse.json({
        error: 'Waktu clock out tidak valid (sebelum clock in)'
      }, { status: 400 })
    }

    // 6. Siapkan keterangan
    let keteranganFinal = existing.keterangan || null
    if (is_offline_sync) {
      const syncNote = `[OFFLINE SYNC] Clock out offline pada ${clockTime.toLocaleString('id-ID')}, di-upload ${new Date().toLocaleString('id-ID')}`
      keteranganFinal = keteranganFinal ? `${keteranganFinal} | ${syncNote}` : syncNote
    }
    if (keterangan) {
      keteranganFinal = keteranganFinal ? `${keteranganFinal} | ${keterangan}` : keterangan
    }

    // 7. Update attendance dengan clock out
    const updateData: any = {
      clock_out: clockTime.toISOString(),
      clock_out_lat: latitude,
      clock_out_lng: longitude,
      clock_out_lokasi: `${latitude}, ${longitude}`,
      jam_kerja_menit: jamKerjaMenit,
      keterangan: keteranganFinal,
      updated_at: new Date().toISOString()
    }

    const { data: result, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const jam = Math.floor(jamKerjaMenit / 60)
    const menit = jamKerjaMenit % 60

    const successMsg = is_offline_sync
      ? `✅ Clock Out offline berhasil di-sync (${clockTime.toLocaleString('id-ID')}) - Total kerja: ${jam}j ${menit}m`
      : `✅ Clock Out berhasil pada ${clockTime.toLocaleTimeString('id-ID')}. Total kerja: ${jam}j ${menit}m`

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