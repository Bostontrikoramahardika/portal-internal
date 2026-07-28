import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin as supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    const body = await request.json()
    const { tanggal, jam_mulai, jam_selesai, alasan, jenis_lembur, atasan_nrp } = body

    if (!tanggal || !jam_mulai || !jam_selesai || !alasan || !atasan_nrp) {
      return NextResponse.json({ error: 'Semua field wajib diisi (termasuk atasan)' }, { status: 400 })
    }

    // ─── Data karyawan pengaju ─────────────────────────────────────────
    const { data: empInfo } = await supabase
      .from('employees')
      .select('site, departemen, jabatan')
      .eq('nrp', session.nrp)
      .maybeSingle()

    const userSite    = empInfo?.site || ''
    const userJabatan = (empInfo?.jabatan || '').toLowerCase()

    // ─── Deteksi direct-to-PJO (sesuai atasan-list) ──────────────────
    const userRoles: string[] = Array.isArray((session as any).roles) ? (session as any).roles : []
    const isGLRole = userRoles.some(r => 
      ['gl_plant', 'gl_produksi', 'hr_site', 'she_site', 'admin_site'].includes(r)
    )
    const isDirectPJOByJabatan =
      /\bshe\b/.test(userJabatan)       ||
      /\bhrga\b/.test(userJabatan)      ||
      /\bhr\b/.test(userJabatan)        ||
      /\badmin\b/.test(userJabatan)     ||
      /\bgl\b/.test(userJabatan)        ||
      /\bgroup leader\b/.test(userJabatan) ||
      /\bsupervisor\b/.test(userJabatan) ||
      /\bmanager\b/.test(userJabatan)   ||
      userJabatan.includes('production gl') ||
      userJabatan.includes('plant gl')

    const isDirectPJO = isDirectPJOByJabatan || isGLRole

    // ─── Validasi atasan (kalau bukan direct PJO) ────────────────────
    let atasanCheck: any = null
    if (!isDirectPJO) {
      const { data: ac } = await supabase
        .from('employees')
        .select('nrp, nama')
        .eq('nrp', atasan_nrp)
        .maybeSingle()
      if (!ac) {
        return NextResponse.json({ error: 'Atasan yang dipilih tidak ditemukan' }, { status: 400 })
      }
      atasanCheck = ac
    }

    // ─── Hitung total jam ─────────────────────────────────────────────
    const [startH, startM] = jam_mulai.split(':').map(Number)
    const [endH, endM]     = jam_selesai.split(':').map(Number)
    let totalMenit = (endH * 60 + endM) - (startH * 60 + startM)
    if (totalMenit < 0) totalMenit += 1440
    const totalJam = Math.round((totalMenit / 60) * 100) / 100

    if (totalJam <= 0) {
      return NextResponse.json({ error: 'Jam selesai harus lebih besar dari jam mulai' }, { status: 400 })
    }

    // ─── AUTO-DETECT PJO — PATOKAN UTAMA: sites_config ───────────────
    // ✅ FIX: baca dari sites_config, bukan cari role 'pjo' (nama lama)
    const { data: siteConfig } = await supabase
      .from('sites_config')
      .select('pjo_nrp, deputy_pjo_nrp')
      .eq('nama_site', userSite)
      .eq('active', true)
      .maybeSingle()

    let chosenPjoNrp: string | null = siteConfig?.pjo_nrp || null
    let chosenPjoNama: string | null = null

    // ─── FALLBACK 1: kalau primary PJO null, coba Deputy ─────────────
    if (!chosenPjoNrp && siteConfig?.deputy_pjo_nrp) {
      chosenPjoNrp = siteConfig.deputy_pjo_nrp
    }

    // ─── FALLBACK 2: kalau sites_config kosong, cari role 'pjo_site' scoped ke site ini ─
    if (!chosenPjoNrp) {
      const { data: pjoRoles } = await supabase
        .from('roles')
        .select('nrp')
        .eq('role', 'pjo_site')       // ✅ FIX: pjo_site (nama baru)
        .eq('active', true)

      const pjoNrps = (pjoRoles || []).map(r => r.nrp)
      if (pjoNrps.length > 0) {
        const { data: pjoEmps } = await supabase
          .from('employees')
          .select('nrp, nama, site')
          .in('nrp', pjoNrps)
          .eq('site', userSite)
          .is('tanggal_resign', null)

        if (pjoEmps && pjoEmps.length > 0) {
          chosenPjoNrp = pjoEmps[0].nrp
          chosenPjoNama = pjoEmps[0].nama
        }
      }
    }

    // ─── FALLBACK 3: cari role legacy 'pjo' (backward compat) ────────
    if (!chosenPjoNrp) {
      const { data: pjoLegacyRoles } = await supabase
        .from('roles')
        .select('nrp')
        .eq('role', 'pjo')
        .eq('active', true)

      const pjoLegacyNrps = (pjoLegacyRoles || []).map(r => r.nrp)
      if (pjoLegacyNrps.length > 0) {
        const { data: pjoLegacyEmps } = await supabase
          .from('employees')
          .select('nrp, nama, site')
          .in('nrp', pjoLegacyNrps)
          .eq('site', userSite)
          .is('tanggal_resign', null)

        if (pjoLegacyEmps && pjoLegacyEmps.length > 0) {
          chosenPjoNrp = pjoLegacyEmps[0].nrp
          chosenPjoNama = pjoLegacyEmps[0].nama
        }
      }
    }

    // ─── Kalau tetap kosong → tolak dengan pesan jelas ──────────────
    if (!chosenPjoNrp) {
      return NextResponse.json({ 
        error: `Belum ada PJO/Deputy untuk site "${userSite}". Hubungi HR untuk set PJO Site.` 
      }, { status: 400 })
    }

    // ─── Ambil nama PJO (kalau belum ke-set dari fallback) ──────────
    if (!chosenPjoNama) {
      const { data: pjoData } = await supabase
        .from('employees')
        .select('nama')
        .eq('nrp', chosenPjoNrp)
        .maybeSingle()
      chosenPjoNama = pjoData?.nama || 'PJO'
    }

    // ─── Insert overtime request ─────────────────────────────────────
    const { data: newOvertime, error: insertError } = await supabase
      .from('overtime_requests')
      .insert({
        nrp: session.nrp,
        tanggal,
        jam_mulai,
        jam_selesai,
        total_jam: totalJam,
        alasan,
        jenis_lembur: jenis_lembur || 'BIASA',
        atasan_nrp: isDirectPJO ? chosenPjoNrp : atasan_nrp,
        pjo_nrp: chosenPjoNrp,
        status_atasan: isDirectPJO ? 'APPROVED' : 'PENDING',
        status_pjo: isDirectPJO ? 'PENDING' : 'WAITING',
        status_final: isDirectPJO ? 'MENUNGGU_PJO' : 'MENUNGGU_ATASAN'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: isDirectPJO
        ? `✅ Pengajuan lembur ${totalJam} jam berhasil dibuat. Langsung menunggu approval PJO (${chosenPjoNama}).`
        : `✅ Pengajuan lembur ${totalJam} jam berhasil dibuat. Menunggu approval atasan (${atasanCheck?.nama}), lalu final ke PJO (${chosenPjoNama}).`,
      data: newOvertime
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}