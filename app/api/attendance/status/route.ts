// app/api/attendance/status/route.ts
// v6.0 - FINAL FIX untuk kasus shift malam sudah clock-out
// 
// Perubahan dari v5.0:
// - Kalau kemarin shift MALAM SUDAH clock-out & sekarang < jam 12 → tetap tampilkan
//   (biar UI mobile tampilkan "SHIFT SELESAI", bukan "CLOCK IN")
// - Logic v5.0 (belum clock-out) tetap dipertahankan
//
// Aman: tidak menulis/mengubah data attendance, cuma read logic
// Kompatibel: frontend sudah handle 3 kondisi (no-in / no-out / done)

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
    const { data: emp } = await supabase
      .from('employees')
      .select('site, nama, jabatan, departemen')
      .eq('nrp', session.nrp)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'Data karyawan tidak ditemukan' }, { status: 404 })
    }

    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('*')
      .eq('nama_site', emp.site)
      .single()

    const siteTz: Timezone = (siteConfig?.timezone || DEFAULT_TIMEZONE) as Timezone
    const today = getSiteDate(null, siteTz)
    const firstDayStr = getSiteFirstDayOfMonth(siteTz)
    const currentHour = getSiteHour(null, siteTz)
    
    const currentShift = (currentHour >= 4 && currentHour < 16) ? 'SIANG' : 'MALAM'

    // Get yesterday
    const yesterdayDate = new Date(today + 'T00:00:00Z')
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
    const yesterday = yesterdayDate.toISOString().split('T')[0]

    // Get ALL records dari kemarin & hari ini
    const { data: allRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('nrp', session.nrp)
      .in('tanggal', [yesterday, today])
      .order('clock_in', { ascending: false })

    const records = allRecords || []

    // ═══════════════════════════════════════════════════
    // SMART DETECTION untuk "today" attendance
    // 
    // Prinsip: Yang jadi acuan adalah CLOCK IN (data actual),
    //          BUKAN roster. Roster bisa berubah sesuai lapangan.
    // ═══════════════════════════════════════════════════
    let todayAttendance: any = null
    
    // ── STEP 1: Cari record HARI INI (prioritas tertinggi) ──
    const todayRecord = records.find((r: any) => r.tanggal === today)
    
    if (todayRecord) {
      todayAttendance = todayRecord
    } else {
      // ── STEP 2: Cek record KEMARIN (mungkin shift malam lintas hari) ──
      const yesterdayRecord = records.find(
        (r: any) => r.tanggal === yesterday && r.clock_in && r.shift === 'MALAM'
      )
      
      if (yesterdayRecord && currentHour < 12) {
        // Kemarin shift MALAM & sekarang masih pagi (< jam 12)
        // Tampilkan record ini, apapun status clock_out-nya:
        //   - Belum clock-out → UI tampilkan tombol "CLOCK OUT"
        //   - Sudah clock-out → UI tampilkan "SHIFT SELESAI" 
        //                       (biar tidak muncul tombol "CLOCK IN" prematur)
        todayAttendance = yesterdayRecord
      }
      // Kalau sudah >= jam 12 → biarkan null (siap-siap shift berikutnya)
      // Kalau kemarin SIANG lupa clock-out → biarkan null (popup close-previous handle)
    }

    // ═══════════════════════════════════════════════════
    // Stats bulan ini
    // ═══════════════════════════════════════════════════
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
      all_recent_records: records,
      stats,
      server_time: new Date().toISOString(),
      site_timezone: siteTz
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}