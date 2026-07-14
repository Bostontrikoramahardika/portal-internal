import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

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

     const { data: empInfo } = await supabase
      .from('employees')
      .select('site, departemen, jabatan')
      .eq('nrp', session.nrp)
      .single()

    const userJabatan = (empInfo?.jabatan || '').toLowerCase()
    const isDirectPJO =
      userJabatan.includes('she') ||
      userJabatan.includes('hrga') ||
      userJabatan.includes('hr ') ||
      userJabatan.includes('admin') ||
      userJabatan.includes('gl ') ||
      userJabatan.includes('supervisor') ||
      userJabatan.includes('manager')

    let atasanCheck: any = null
    if (!isDirectPJO) {
      if (!atasan_nrp) {
        return NextResponse.json({ error: 'Atasan wajib dipilih' }, { status: 400 })
      }
      const { data: ac } = await supabase
        .from('employees')
        .select('nrp, nama')
        .eq('nrp', atasan_nrp)
        .single()
      if (!ac) {
        return NextResponse.json({ error: 'Atasan yang dipilih tidak ditemukan' }, { status: 400 })
      }
      atasanCheck = ac
    }

    // Hitung total jam
    const [startH, startM] = jam_mulai.split(':').map(Number)
    const [endH, endM] = jam_selesai.split(':').map(Number)
    let totalMenit = (endH * 60 + endM) - (startH * 60 + startM)
    if (totalMenit < 0) totalMenit += 1440
    const totalJam = Math.round((totalMenit / 60) * 100) / 100

    if (totalJam <= 0) {
      return NextResponse.json({ error: 'Jam selesai harus lebih besar dari jam mulai' }, { status: 400 })
    }

    // AUTO-DETECT PJO
    const { data: karyawan } = await supabase
      .from('employees')
      .select('site')
      .eq('nrp', session.nrp)
      .single()

    const { data: pjoRoles } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', 'pjo')
      .eq('active', true)

    const pjoNrps = (pjoRoles || []).map(r => r.nrp)

    if (pjoNrps.length === 0) {
      return NextResponse.json({ error: 'Belum ada PJO yang di-set. Hubungi HRGA.' }, { status: 400 })
    }

    const { data: allPjo } = await supabase
      .from('employees')
      .select('nrp, nama, site')
      .in('nrp', pjoNrps)
      .eq('status_karyawan', 'Aktif')

    if (!allPjo || allPjo.length === 0) {
      return NextResponse.json({ error: 'PJO aktif tidak ditemukan' }, { status: 400 })
    }

    const samePjo = allPjo.find((p: any) => p.site === karyawan?.site)
    const chosenPjo = samePjo || allPjo[0]

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
        atasan_nrp: isDirectPJO ? chosenPjo.nrp : atasan_nrp,
        pjo_nrp: chosenPjo.nrp,
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
        ? `✅ Pengajuan lembur ${totalJam} jam berhasil dibuat. Langsung menunggu approval PJO (${chosenPjo.nama}).`
        : `✅ Pengajuan lembur ${totalJam} jam berhasil dibuat. Menunggu approval atasan (${atasanCheck?.nama}), lalu final ke PJO (${chosenPjo.nama}).`,
      data: newOvertime
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}