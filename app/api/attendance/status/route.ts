import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { getWitaToday, getWitaFirstDayOfMonth } from '@/app/lib/timezone'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    const today = getWitaToday()

    // Ambil data karyawan
    const { data: emp } = await supabase
      .from('employees')
      .select('site, nama, jabatan, departemen')
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

    // Ambil absensi hari ini
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .eq('tanggal', today)
      .single()

    // Hitung statistik bulan ini
    // WITA untuk hitung stats bulan ini
    const firstDayStr = getWitaFirstDayOfMonth()

    const { data: monthAttendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('nrp', session.nrp)
      .gte('tanggal', firstDayStr)
      .lte('tanggal', today)

    const stats = {
      hadir: 0,
      terlambat: 0,
      setengah_hari: 0,
      alpha: 0,
      cuti: 0,
      sakit: 0,
      izin: 0,
      total: (monthAttendance || []).length
    }

    ;(monthAttendance || []).forEach((a: any) => {
      const s = String(a.status).toLowerCase()
      if (s === 'hadir') stats.hadir++
      else if (s === 'terlambat') stats.terlambat++
      else if (s === 'setengah_hari') stats.setengah_hari++
      else if (s === 'alpha') stats.alpha++
      else if (s === 'cuti') stats.cuti++
      else if (s === 'sakit') stats.sakit++
      else if (s === 'izin') stats.izin++
    })

    return NextResponse.json({
      employee: emp,
      site_config: siteConfig,
      today: todayAttendance || null,
      stats,
      server_time: new Date().toISOString()
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}