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
    const { latitude, longitude, keterangan } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Lokasi GPS wajib diisi. Aktifkan GPS di HP Anda.' }, { status: 400 })
    }

    // Ambil data karyawan
    const { data: emp } = await supabase
      .from('employees')
      .select('site, nama')
      .eq('nrp', session.nrp)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'Data karyawan tidak ditemukan' }, { status: 404 })
    }

    // Ambil config site
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('*')
      .eq('nama_site', emp.site)
      .single()

    if (!siteConfig) {
      return NextResponse.json({ error: `Setting site "${emp.site}" tidak ditemukan` }, { status: 400 })
    }

    // Validasi jarak GPS
    if (siteConfig.latitude && siteConfig.longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        Number(siteConfig.latitude),
        Number(siteConfig.longitude)
      )

      if (distance > siteConfig.radius_meter) {
        return NextResponse.json({
          error: `Anda berada ${Math.round(distance)}m dari site. Harus di dalam radius ${siteConfig.radius_meter}m.`
        }, { status: 400 })
      }
    }

    // Cek absensi hari ini
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .eq('tanggal', today)
      .single()

    if (!existing || !existing.clock_in) {
      return NextResponse.json({
        error: 'Belum clock in hari ini. Clock in dulu sebelum clock out.'
      }, { status: 400 })
    }

    if (existing.clock_out) {
      return NextResponse.json({
        error: `Anda sudah clock out pada ${new Date(existing.clock_out).toLocaleTimeString('id-ID')}`
      }, { status: 400 })
    }

    // Hitung jam kerja
    const clockInTime = new Date(existing.clock_in)
    const jamKerjaMenit = Math.floor((now.getTime() - clockInTime.getTime()) / 60000)

    // Cek setengah hari (jam kerja < 4 jam)
    let status = existing.status
    if (jamKerjaMenit < 240) { // 4 jam = 240 menit
      status = 'SETENGAH_HARI'
    }

    // Update attendance
    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out: now.toISOString(),
        clock_out_lat: latitude,
        clock_out_lng: longitude,
        clock_out_lokasi: `${latitude}, ${longitude}`,
        jam_kerja_menit: jamKerjaMenit,
        status,
        keterangan: keterangan || existing.keterangan,
        updated_at: now.toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const jam = Math.floor(jamKerjaMenit / 60)
    const menit = jamKerjaMenit % 60

    return NextResponse.json({
      success: true,
      message: `✅ Clock Out berhasil pada ${now.toLocaleTimeString('id-ID')}. Total kerja: ${jam} jam ${menit} menit`,
      data
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}