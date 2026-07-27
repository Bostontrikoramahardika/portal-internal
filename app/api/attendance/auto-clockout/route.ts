// app/api/attendance/auto-clockout/route.ts
// v3.0 - Chat 27: LOGIKA BARU - Berbasis durasi clock_in, bukan tanggal/shift
// - Cari record aktif (clock_in ADA, clock_out BELUM) yang sudah lewat jam standar + toleransi
// - Auto clock-out dengan waktu = clock_in + jam standar shift
// - Tidak peduli tanggal apa, kunci: durasi kerja

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getWitaToday, toWita } from '@/app/lib/timezone'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Konfigurasi toleransi
const JAM_STANDAR_SHIFT = 11 // jam kerja standar
const TOLERANSI_JAM = 9 // toleransi lembur 8 jam + safety 1 jam = 9 jam. Total: 20 jam

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
    const witaLogTime = toWita(now).toISOString().replace('T', ' ').substring(0, 19) + ' WITA'
    
    console.log(`⏰ Auto Clock Out v3.0 running at ${witaLogTime}`)

    // ── Ambil semua site config ──
    const { data: sites } = await supabase
      .from('sites_config')
      .select('nama_site, siang_jam_masuk, siang_jam_pulang, malam_jam_masuk, malam_jam_pulang')
      .eq('active', true)

    if (!sites || sites.length === 0) {
      return NextResponse.json({ ok: true, message: 'Tidak ada site aktif', processed: 0 })
    }

    // ── Cari SEMUA record aktif dalam 3 hari terakhir yang belum clock-out ──
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const threeDaysAgoStr = new Date(threeDaysAgo.getTime() + 8 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const { data: pendingList, error: fetchErr } = await supabase
      .from('attendance')
      .select('id, nrp, tanggal, clock_in, shift, site, keterangan')
      .gte('tanggal', threeDaysAgoStr)
      .not('clock_in', 'is', null)
      .is('clock_out', null)

    if (fetchErr) {
      console.error('❌ Fetch pending error:', fetchErr.message)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!pendingList || pendingList.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'Tidak ada record aktif',
        total_checked: 0,
        total_auto_clockout: 0,
        executed_at_wita: witaLogTime
      })
    }

    // Build map site config untuk lookup cepat
    const siteMap = new Map(sites.map(s => [s.nama_site, s]))

    let totalAutoClockOut = 0
    const results: any[] = []
    const skipped: any[] = []

    for (const att of pendingList) {
      const siteConfig = siteMap.get(att.site)
      if (!siteConfig) {
        skipped.push({ nrp: att.nrp, reason: `Site config ${att.site} tidak ditemukan` })
        continue
      }

      // Hitung durasi sejak clock-in (dalam jam)
      const clockInTime = new Date(att.clock_in)
      const diffMs = now.getTime() - clockInTime.getTime()
      const durasiJam = diffMs / (1000 * 60 * 60)

      // Batas trigger: 11 + 2 = 13 jam
      if (durasiJam < JAM_STANDAR_SHIFT + TOLERANSI_JAM) {
        continue // Belum waktunya, biarkan karyawan clock-out manual
      }

      // ── Tentukan waktu auto clock-out = clock_in + jam standar shift ──
      // Pakai jam pulang sesuai shift
      let jamPulang: string
      if (att.shift === 'SIANG') {
        jamPulang = siteConfig.siang_jam_pulang || '17:00:00'
      } else {
        jamPulang = siteConfig.malam_jam_pulang || '05:00:00'
      }

      // Hitung waktu clock-out yang seharusnya
      // Ambil tanggal dari clock_in WITA, lalu set jam pulang
      const clockInWita = new Date(clockInTime.getTime() + 8 * 60 * 60 * 1000)
      const clockInDateStr = clockInWita.toISOString().split('T')[0]
      
      const [pH, pM] = jamPulang.split(':').map(Number)
      
      // Kalau shift MALAM & jam pulang pagi (< 12), tanggal pulang = clock_in + 1 hari
      let autoClockOutDate = clockInDateStr
      if (att.shift === 'MALAM' && pH < 12) {
        const nextDay = new Date(clockInWita)
        nextDay.setUTCDate(nextDay.getUTCDate() + 1)
        autoClockOutDate = nextDay.toISOString().split('T')[0]
      }

      // Build ISO string dengan offset WITA
      const autoClockOutIso = `${autoClockOutDate}T${String(pH).padStart(2, '0')}:${String(pM || 0).padStart(2, '0')}:00+08:00`
      const autoClockOutTime = new Date(autoClockOutIso)

      // Safety: kalau hasil > now, cap ke now
      const finalClockOutTime = autoClockOutTime.getTime() > now.getTime() ? now : autoClockOutTime

      // Hitung jam kerja final
      const finalDiffMs = finalClockOutTime.getTime() - clockInTime.getTime()
      const jamKerjaMenit = Math.max(0, Math.floor(finalDiffMs / (1000 * 60)))

      // Format log
      const witaClockOutLog = toWita(finalClockOutTime).toISOString().replace('T', ' ').substring(0, 19) + ' WITA'

          // ── Update attendance ──
      const { error: updateErr } = await supabase
        .from('attendance')
        .update({
          clock_out: finalClockOutTime.toISOString(),
          clock_out_lat: 0,
          clock_out_lng: 0,
          clock_out_lokasi: 'AUTO CLOCK OUT - SISTEM',
          jam_kerja_menit: jamKerjaMenit,
          status: 'TIDAK CLOCK OUT',
          keterangan: (att.keterangan ? `${att.keterangan} | ` : '') + 
            `[AUTO CLOCK OUT v3.0] Karyawan tidak clock out manual. Sistem auto clock out pada ${witaClockOutLog}. Durasi sejak clock in: ${durasiJam.toFixed(1)} jam.`,
          updated_at: now.toISOString()
        })
        .eq('id', att.id)

      if (updateErr) {
        console.error(`❌ Auto clock out gagal NRP ${att.nrp}:`, updateErr.message)
        skipped.push({ nrp: att.nrp, reason: updateErr.message })
        continue
      }

      // ── Ambil data atasan & email untuk notif ──
      let atasanNrp: string | null = null
      const { data: approval } = await supabase
        .from('approval_matrix')
        .select('atasan_nrp')
        .eq('employee_nrp', att.nrp)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (approval) atasanNrp = approval.atasan_nrp

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
          pesan: `Auto clock out oleh sistem pada ${witaClockOutLog}. Karyawan ${empData?.nama || att.nrp} tidak clock out manual (durasi kerja: ${durasiJam.toFixed(1)} jam).`,
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
        shift: att.shift,
        tanggal: att.tanggal,
        clock_in: att.clock_in,
        auto_clockout_at: finalClockOutTime.toISOString(),
        durasi_jam: durasiJam.toFixed(1)
      })
    }

    console.log(`✅ Auto Clock Out v3.0 selesai: ${totalAutoClockOut}/${pendingList.length} diproses`)

    return NextResponse.json({
      ok: true,
      message: `Auto clock out v3.0 selesai`,
      total_pending: pendingList.length,
      total_auto_clockout: totalAutoClockOut,
      total_skipped: skipped.length,
      results,
      skipped,
      executed_at: now.toISOString(),
      executed_at_wita: witaLogTime,
      logic_version: '3.0 - Berbasis durasi clock_in'
    })

  } catch (err: any) {
    console.error('❌ Auto clock out error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}