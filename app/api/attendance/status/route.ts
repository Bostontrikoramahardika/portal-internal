// app/api/attendance/status/route.ts
// v4.0 - Chat 30 FINAL: Cross-day active record detection
// - Prioritas: record ACTIVE (clock_in ada, clock_out NULL) dari kemarin/hari ini
// - Fallback: record shift saat ini
// - Fallback: null (biar Clock In fresh)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { 
  getSiteDate, 
  getSiteFirstDayOfMonth, 
  getSiteHour,
  Timezone, 
  DEFAULT_TIMEZONE 
} from '@/app/lib/timezone'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    // Ambil data karyawan
    const { data: emp } = await supabase
      .from('employees')
      .select('site, nama, jabatan, departemen')
      .eq('nrp', session.nrp)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'Data karyawan tidak ditemukan' }, { status: 404 })
    }

    // Ambil config site (WAJIB include timezone)
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('*')
      .eq('nama_site', emp.site)
      .single()

    const siteTz: Timezone = (siteConfig?.timezone || DEFAULT_TIMEZONE) as Timezone
    const today = getSiteDate(null, siteTz)
    const firstDayStr = getSiteFirstDayOfMonth(siteTz)
    const currentHour = getSiteHour(null, siteTz)
    
    // Auto-detect shift SAAT INI
    const currentShift = (currentHour >= 4 && currentHour < 16) ? 'SIANG' : 'MALAM'

    // ⭐ CHAT 30 v4.0: CROSS-DAY ACTIVE RECORD DETECTION
    // Hitung tanggal kemarin (untuk MALAM lintas hari)
    const yesterdayDate = new Date(today + 'T00:00:00Z')
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
    const yesterday = yesterdayDate.toISOString().split('T')[0]

    // STEP 1: Cari record AKTIF (clock_in ADA, clock_out NULL) dari kemarin & hari ini
    // Ini yang paling penting - kalau ada record aktif, user tinggal clock-out
    const { data: activeRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .in('tanggal', [yesterday, today])
      .not('clock_in', 'is', null)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)

    let todayAttendance: any = null
    
    if (activeRecords && activeRecords.length > 0) {
      // ⭐ Ada record aktif → itu prioritas (belum clock-out)
      // Bisa dari kemarin (MALAM lintas hari) atau hari ini
      todayAttendance = activeRecords[0]
    } else {
      // STEP 2: Tidak ada record aktif → ambil record shift SAAT INI
      const { data: currentShiftRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('nrp', session.nrp)
        .eq('tanggal', today)
        .eq('shift', currentShift)
        .order('clock_in', { ascending: false })
        .limit(1)
      
      if (currentShiftRecords && currentShiftRecords.length > 0) {
        todayAttendance = currentShiftRecords[0]
      }
      // Kalau tidak ada juga → todayAttendance tetap null (Clock In fresh)
    }

    // Bonus: ambil semua record hari ini untuk info
    const { data: allTodayRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .in('tanggal', [yesterday, today])
      .order('clock_in', { ascending: false })

    // Ambil absensi bulan ini untuk stats
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
      current_shift: currentShift,
      site_date_today: today,
      all_recent_records: allTodayRecords || [],
      stats,
      server_time: new Date().toISOString(),
      site_timezone: siteTz
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}