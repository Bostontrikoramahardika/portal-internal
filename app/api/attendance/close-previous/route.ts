// app/api/attendance/close-previous/route.ts
// Chat 30 - Close previous attendance record dengan jam custom
// Dipakai saat user lupa clock-out, lalu datang hari berikutnya
// User input jam pulang → set clock_out ke record lama

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { 
  getSiteDate, 
  formatSiteTime,
  Timezone,
  DEFAULT_TIMEZONE
} from '@/app/lib/timezone'

function getTimezoneOffsetHours(tz: Timezone): number {
  switch (tz) {
    case 'Asia/Jakarta':  return 7
    case 'Asia/Makassar': return 8
    case 'Asia/Jayapura': return 9
    default: return 8
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    const body = await request.json()
    const { 
      attendance_id,      // ID record yang mau di-close
      jam_pulang,          // Format: "17:00" atau "20:30"
      is_default_time      // true = pakai jam default shift, false = jam manual
    } = body

    if (!attendance_id || !jam_pulang) {
      return NextResponse.json({ 
        error: 'attendance_id dan jam_pulang wajib diisi' 
      }, { status: 400 })
    }

    // Validasi format jam (HH:MM)
    const jamMatch = jam_pulang.match(/^(\d{1,2}):(\d{2})$/)
    if (!jamMatch) {
      return NextResponse.json({ 
        error: 'Format jam salah. Gunakan HH:MM (contoh: 17:00)' 
      }, { status: 400 })
    }

    const [_, jamStr, menitStr] = jamMatch
    const jam = parseInt(jamStr)
    const menit = parseInt(menitStr)

    if (jam < 0 || jam > 23 || menit < 0 || menit > 59) {
      return NextResponse.json({ 
        error: 'Jam tidak valid (0-23) atau menit tidak valid (0-59)' 
      }, { status: 400 })
    }

    // Ambil record yang mau di-close
    const { data: record } = await supabase
      .from('attendance')
      .select('*')
      .eq('id', attendance_id)
      .eq('nrp', session.nrp)  // Security: harus milik user sendiri
      .single()

    if (!record) {
      return NextResponse.json({ 
        error: 'Record tidak ditemukan atau bukan milik Anda' 
      }, { status: 404 })
    }

    if (record.clock_out) {
      return NextResponse.json({ 
        error: 'Record sudah pernah clock-out' 
      }, { status: 400 })
    }

    if (!record.clock_in) {
      return NextResponse.json({ 
        error: 'Record belum clock-in, tidak bisa clock-out' 
      }, { status: 400 })
    }

    // Ambil site config untuk timezone
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('timezone')
      .eq('nama_site', record.site)
      .single()

    const siteTz: Timezone = (siteConfig?.timezone || DEFAULT_TIMEZONE) as Timezone

    // ⭐ Build clock_out timestamp
    // Tanggal pulang:
    // - Shift SIANG: sama dengan tanggal record
    // - Shift MALAM: tanggal record + 1 hari (kalau jam < 12) 
    //                atau tanggal sama (kalau jam >= 12, misal lembur ekstrim)
    let clockOutDate = record.tanggal  // YYYY-MM-DD
    
    if (record.shift === 'MALAM' && jam < 12) {
      // Shift MALAM pulang subuh/pagi hari berikutnya
      const nextDate = new Date(clockOutDate + 'T00:00:00Z')
      nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      clockOutDate = nextDate.toISOString().split('T')[0]
    }

    // Build ISO string dengan offset timezone site
    const tzOffsetHours = getTimezoneOffsetHours(siteTz)
    const tzOffsetStr = tzOffsetHours >= 0 
      ? `+${String(tzOffsetHours).padStart(2, '0')}:00` 
      : `-${String(Math.abs(tzOffsetHours)).padStart(2, '0')}:00`
    
    const clockOutIso = `${clockOutDate}T${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}:00${tzOffsetStr}`
    const clockOutTime = new Date(clockOutIso)

    // Validasi: clock_out harus > clock_in
    const clockInTime = new Date(record.clock_in)
    if (clockOutTime.getTime() <= clockInTime.getTime()) {
      return NextResponse.json({ 
        error: `Jam pulang (${jam_pulang}) tidak valid. Harus SETELAH clock in.` 
      }, { status: 400 })
    }

    // Validasi: clock_out tidak boleh > sekarang (masa depan)
    const now = new Date()
    if (clockOutTime.getTime() > now.getTime()) {
      return NextResponse.json({ 
        error: `Jam pulang tidak boleh di masa depan.` 
      }, { status: 400 })
    }

    // Hitung jam kerja
    const diffMs = clockOutTime.getTime() - clockInTime.getTime()
    const jamKerjaMenit = Math.floor(diffMs / (1000 * 60))

    // Update record
    const clockOutDisplay = formatSiteTime(clockOutTime, siteTz, 'full')
    const noteType = is_default_time ? 'Sesuai jadwal' : 'Jam manual'
    
    const { data: updated, error: updateErr } = await supabase
      .from('attendance')
      .update({
        clock_out: clockOutTime.toISOString(),
        clock_out_lat: 0,
        clock_out_lng: 0,
        clock_out_lokasi: `CLOSED BY USER (${noteType})`,
        jam_kerja_menit: jamKerjaMenit,
        keterangan: (record.keterangan ? `${record.keterangan} | ` : '') + 
          `[CLOSE PREVIOUS] Clock-out kemarin diisi user pada ${new Date().toISOString()}, pulang ${clockOutDisplay} (${noteType})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', attendance_id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    const jam_kerja = Math.floor(jamKerjaMenit / 60)
    const menit_kerja = jamKerjaMenit % 60

    return NextResponse.json({
      success: true,
      message: `✅ Absen kemarin berhasil ditutup. Jam pulang: ${jam_pulang} WITA. Total kerja: ${jam_kerja}j ${menit_kerja}m`,
      data: updated
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}