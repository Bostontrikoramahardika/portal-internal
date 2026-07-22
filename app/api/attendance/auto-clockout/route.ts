// app/api/attendance/auto-clockout/route.ts
// ═══════════════════════════════════════════
// CRON JOB: Auto clock out karyawan yang lupa
// Jalan setiap jam via Vercel Cron
// TIDAK MENGUBAH file attendance existing
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // max 30 detik

export async function GET(req: NextRequest) {
  // ── SECURITY: Hanya boleh dari Vercel Cron atau manual super admin ──
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET || ''
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  // Kalau bukan cron, cek apakah super admin
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
    const currentHour = now.getUTCHours() + 8 // WIB = UTC+7, tapi kita pakai +8 untuk safety margin
    const adjustedHour = ((now.getUTCHours() + 7) % 24)
    
    console.log(`⏰ Auto Clock Out running at ${now.toISOString()} (WIB ~${adjustedHour}:00)`)

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

      // ── CEK SHIFT SIANG: 1 jam setelah jam pulang siang ──
      // Misal: pulang 17:00 → auto clock out jam 18:00
      const siangAutoH = siangPulangH + 1

      // ── CEK SHIFT MALAM: 1 jam setelah jam pulang malam ──
      // Misal: pulang 05:00 → auto clock out jam 06:00
      const malamAutoH = malamPulangH + 1

      // Cek apakah jam sekarang cocok untuk auto clock out
      let processShift: string | null = null
      let jamPulang: string = ''

      if (adjustedHour === siangAutoH) {
        processShift = 'SIANG'
        jamPulang = site.siang_jam_pulang
      } else if (adjustedHour === malamAutoH) {
        processShift = 'MALAM'
        jamPulang = site.malam_jam_pulang
      }

      if (!processShift) continue

      // ── Cari attendance yang clock in tapi belum clock out ──
      // Untuk shift SIANG: tanggal = hari ini
      // Untuk shift MALAM: tanggal = kemarin (karena clock in malam, pulang pagi)
      let targetDate: string
      if (processShift === 'SIANG') {
        targetDate = now.toISOString().split('T')[0]
      } else {
        // Shift malam: tanggal attendance = kemarin
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        targetDate = yesterday.toISOString().split('T')[0]
      }

      const { data: pendingList } = await supabase
        .from('attendance')
        .select('id, nrp, tanggal, clock_in, shift, site')
        .eq('site', site.nama_site)
        .eq('tanggal', targetDate)
        .eq('shift', processShift)
        .is('clock_out', null)
        .not('clock_in', 'is', null)

      if (!pendingList || pendingList.length === 0) continue

      // ── Auto clock out setiap orang ──
      for (const att of pendingList) {
        // Hitung jam pulang yang seharusnya
        const [pH, pM] = jamPulang.split(':').map(Number)
        const autoClockOutTime = new Date(att.tanggal + 'T00:00:00+07:00')
        autoClockOutTime.setHours(pH, pM || 0, 0, 0)
        
        // Untuk shift malam, jam pulang = hari berikutnya
        if (processShift === 'MALAM' && pH < 12) {
          autoClockOutTime.setDate(autoClockOutTime.getDate() + 1)
        }

        // Hitung jam kerja
        const clockInTime = new Date(att.clock_in)
        const diffMs = autoClockOutTime.getTime() - clockInTime.getTime()
        const jamKerjaMenit = Math.max(0, Math.floor(diffMs / (1000 * 60)))

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
            keterangan: `[AUTO CLOCK OUT] Karyawan tidak clock out manual. Sistem auto clock out pada jam pulang ${jamPulang}. Waktu proses: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
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
            pesan: `Auto clock out oleh sistem pada ${autoClockOutTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}. Karyawan ${empData?.nama || att.nrp} tidak clock out manual.`,
            email_sent: false,
            email_to: emailKaryawan,
            email_atasan_to: emailAtasan
          }, {
            onConflict: 'nrp,tanggal,tipe'
          })

        // ── TODO: Kirim email (aktifkan nanti setelah email service siap) ──
        // await sendAutoClockOutEmail(emailKaryawan, emailAtasan, empData?.nama, att.tanggal)

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
      executed_at: now.toISOString()
    })

  } catch (err: any) {
    console.error('❌ Auto clock out error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}