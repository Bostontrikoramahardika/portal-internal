// app/api/attendance/status/route.ts
// v3.0 - Chat 30 FINAL: Smart shift detection
// - Cari record ACTIVE (belum clock-out) dulu, prioritas ini
// - Fallback: record shift SAAT INI (auto-detect)
// - Fallback: record terbaru hari ini

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
    
    // ⭐ Auto-detect shift SAAT INI
    const currentShift = (currentHour >= 4 && currentHour < 16) ? 'SIANG' : 'MALAM'

    // ⭐ CHAT 30 v3.0 — SMART DETECTION
    // Step 1: Ambil SEMUA record hari ini (kemungkinan SIANG + MALAM)
    const { data: allTodayRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .eq('tanggal', today)
      .order('clock_in', { ascending: false })

    // Step 2: Cari record AKTIF (clock_in ADA, clock_out BELUM)
    const activeRecord = (allTodayRecords || []).find(
      (r: any) => r.clock_in && !r.clock_out
    )

    // Step 3: Kalau ada record aktif → itu prioritas (belum clock-out)
    // Step 4: Kalau tidak ada aktif → cari record shift SAAT INI
    // Step 5: Kalau shift saat ini belum ada → return null (biar bisa clock-in fresh)
    let todayAttendance: any = null
    
    if (activeRecord) {
      // Ada record aktif = user sedang di dalam shift, tinggal clock-out
      todayAttendance = activeRecord
    } else {
      // Tidak ada record aktif → cek record shift saat ini
      const currentShiftRecord = (allTodayRecords || []).find(
        (r: any) => r.shift === currentShift
      )
      
      if (currentShiftRecord) {
        // Ada record shift saat ini (biasanya sudah clock-out) 
        todayAttendance = currentShiftRecord
      } else {
        // Cek juga: apakah semua record hari ini sudah clock-out?
        // Kalau ada record shift lain yang sudah clock-out, return null (biar bisa clock-in shift baru)
        // Kalau tidak ada record apapun → return null
        todayAttendance = null
      }
    }

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
      current_shift: currentShift,  // ⭐ Info untuk frontend
      all_today_records: allTodayRecords || [],  // ⭐ Bonus info
      stats,
      server_time: new Date().toISOString(),
      site_timezone: siteTz
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}