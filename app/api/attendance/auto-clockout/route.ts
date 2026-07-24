// app/api/attendance/auto-clockout/route.ts
// ═══════════════════════════════════════════
// CRON JOB: Auto clock out karyawan yang lupa
// Jalan setiap jam via Supabase pg_cron
// TIDAK MENGUBAH file attendance existing
// v2.0 - Chat 19: FIX timezone WITA (UTC+8) consistent
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getWitaHour, getWitaToday, toWita, toWitaDate } from '@/app/lib/timezone'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  // ── SECURITY: Hanya boleh dari Cron atau super admin ──
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET || ''
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    const token = req.cookies.get('session_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { getSession } = await import('@/app/lib/auth')
    const session = await getSession(token)
    if (!session?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden - Cron atau Super Admin only' }, { status: 403 })
    }
  }

  try {
    const now = new Date()
    const witaHour = getWitaHour() // WITA = UTC+8
    const witaToday = getWitaToday()

    console.log(`⏰ Auto Clock Out running at ${now.toISOString()} (WITA hour: ${witaHour})`)

    // ── Ambil semua site config ──
    const { data: sites } = await supabase
      .from('sites_config')
      .select('nama_site, siang_jam_pulang, malam_jam_pulang')
      .eq('active', true)

    if (!sites || sites.length === 0) {
      return NextResponse.json({ ok: true, message: 'Tidak ada site aktif', processed: 0 })
    }

    let totalProcessed = 0
    let totalAutoClockOut = 0
    const results: any[] = []

    for (const site of sites) {
      // Parse jam pulang
      const siangPulangH = parseInt((site.siang_jam_pulang || '17:00:00').split(':')[0])
      const malamPulangH = parseInt((site.malam_jam_pulang || '05:00:00').split(':')[0])

      // Auto clock out = 1 jam setelah jam pulang
      const siangAutoH = siangPulangH + 1
      const malamAutoH = malamPulangH + 1

      // Cek apakah jam WITA sekarang cocok
      let processShift: string | null = null
      let jamPulang = ''

      if (witaHour === siangAutoH) {
        processShift = 'SIANG'
        jamPulang = site.siang_jam_pulang
      } else if (witaHour === malamAutoH) {
        processShift = 'MALAM'
        jamPulang = site.malam_jam_pulang
      }

      if (!processShift) continue

      // ── Tentukan tanggal target ──
      // Shift SIANG: tanggal hari ini (WITA)
      // Shift MALAM: tanggal kemarin (WITA) karena clock in malam, pulang pagi
      let targetDate: string
      if (processShift === 'SIANG') {
        targetDate = witaToday
      } else {
        // Kemarin WITA
        const yesterdayWita = new Date(Date.now() + 8 * 60 * 60 * 1000)
        yesterdayWita.setUTCDate(yesterdayWita.getUTCDate() - 1)
        targetDate = yesterdayWita.toISOString().split('T')[0]
      }

      // ── Cari attendance yang clock in tapi belum clock out ──
      const { data: pendingList } = await supabase
        .from('attendance')
        .select('id, nrp, tanggal, clock_in, shift, site')
        .eq('site', site.nama_site)
        .eq('tanggal', targetDate)
        .eq('shift', processShift)
        .is('clock_out', null)
        .not('clock_in', 'is', null)

      if (!pendingList || pendingList.length === 0) continue

      // ── Auto clock out setiap karyawan ──
      for (const att of pendingList) {
        // Hitung waktu auto clock out (WITA)
        const [pH, pM] = jamPulang.split(':').map(Number)
        // Buat ISO string dengan offset WITA (+08:00)
        let autoClockOutIso = `${att.tanggal}T${String(pH).padStart(2, '0')}:${String(pM || 0).padStart(2, '0')}:00+08:00`
        let autoClockOutTime = new Date(autoClockOutIso)

        // Untuk shift malam dengan jam pulang pagi (<12), waktu pulang = hari berikutnya
        if (processShift === 'MALAM' && pH < 12) {
          const nextDay = new Date(autoClockOutTime)
          nextDay.setUTCDate(nextDay.getUTCDate() + 1)
          autoClockOutTime = nextDay
        }

        // Hitung jam kerja
        const clockInTime = new Date(att.clock_in)
        const diffMs = autoClockOutTime.getTime() - clockInTime.getTime()
        const jamKerjaMenit = Math.max(0, Math.floor(diffMs / (1000 * 60)))

        // Format log message WITA
        const witaLogTime = toWita(now).toISOString().replace('T', ' ').substring(0, 19) + ' WITA'
        const witaClockOutLog = toWita(autoClockOutTime).toISOString().replace('T', ' ').substring(0, 19) + ' WITA'

        // Update attendance
        const { error: updateErr } = await supabase
          .from('attendance')
          .update({
            clock_out: autoClockOutTime.toISOString(),
            clock_out_lat: 0,
            clock_out_lng: 0,
            clock_out_lokasi: 'AUTO CLOCK OUT - SISTEM',
            jam_kerja_menit: jamKerjaMenit,
            status: 'TIDAK CLOCK OUT',
            keterangan: `[AUTO CLOCK OUT] Karyawan tidak clock out manual. Sistem auto clock out pada jam pulang ${jamPulang} WITA. Waktu proses: ${witaLogTime}`,
            updated_at: now.toISOString()
          })
          .eq('id', att.id)

        if (updateErr) {
          console.error(`❌ Auto clock out gagal NRP ${att.nrp}:`, updateErr.message)
          continue
        }

        // ── Ambil data atasan untuk notif ──
        let atasanNrp: string | null = null
        const { data: approval } = await supabase
          .from('approval_matrix')
          .select('atasan_nrp')
          .eq('employee_nrp', att.nrp)
          .eq('active', true)
          .limit(1)
          .single()

        if (approval) atasanNrp = approval.atasan_nrp

        // ── Ambil email karyawan & atasan ──
        let emailKaryawan: string | null = null
        let emailAtasan: string | null = null

        const { data: empData } = await supabase
          .from('employees')
          .select('nama, email')
          .eq('nrp', att.nrp)
          .single()

        if (empData?.email) emailKaryawan = empData.email

        if (atasanNrp) {
          const { data: atasanData } = await supabase
            .from('employees')
            .select('email')
            .eq('nrp', atasanNrp)
            .single()
          if (atasanData?.email) emailAtasan = atasanData.email
        }

        // ── Simpan log notifikasi ──
        await supabase
          .from('attendance_notifications')
          .upsert({
            nrp: att.nrp,
            tanggal: att.tanggal,
            tipe: 'auto_clockout',
            pesan: `Auto clock out oleh sistem pada ${witaClockOutLog}. Karyawan ${empData?.nama || att.nrp} tidak clock out manual.`,
            email_sent: false,
            email_to: emailKaryawan,
            email_atasan_to: emailAtasan
          }, {
            onConflict: 'nrp,tanggal,tipe'
          })

        totalAutoClockOut++
        results.push({
          nrp: att.nrp,
          nama: empData?.nama || '-',
          site: att.site,
          shift: processShift,
          tanggal: att.tanggal,
          auto_clockout_at: autoClockOutTime.toISOString()
        })
      }

      totalProcessed += pendingList.length
    }

    console.log(`✅ Auto Clock Out selesai: ${totalAutoClockOut}/${totalProcessed} diproses`)

    return NextResponse.json({
      ok: true,
      message: `Auto clock out selesai`,
      total_checked: totalProcessed,
      total_auto_clockout: totalAutoClockOut,
      results,
      executed_at: now.toISOString(),
      executed_at_wita: toWita(now).toISOString().replace('T', ' ').substring(0, 19) + ' WITA'
    })

  } catch (err: any) {
    console.error('❌ Auto clock out error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}