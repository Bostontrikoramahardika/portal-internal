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
    const { tanggal_mulai, tanggal_selesai, jenis_cuti, alasan, atasan_nrp } = body

    if (!tanggal_mulai || !tanggal_selesai || !jenis_cuti || !alasan || !atasan_nrp) {
      return NextResponse.json({ error: 'Semua field wajib diisi (termasuk atasan)' }, { status: 400 })
    }

    const start = new Date(tanggal_mulai + 'T00:00:00')
    const end = new Date(tanggal_selesai + 'T00:00:00')

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
    }

    if (end < start) {
      return NextResponse.json({ error: 'Tanggal selesai harus >= tanggal mulai' }, { status: 400 })
    }

    const jumlahHari = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1

    // Deteksi direct-to-PJO
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

    // Validasi atasan (skip kalau direct-to-PJO)
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

    // AUTO-DETECT PJO: cari PJO berdasarkan site karyawan
    const { data: karyawan } = await supabase
      .from('employees')
      .select('site, departemen, jabatan')
      .eq('nrp', session.nrp)
      .single()

    // Ambil semua PJO aktif (role baru: pjo_site)
    const { data: pjoRoles } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', 'pjo_site')
      .eq('active', true)

    const pjoNrps = (pjoRoles || []).map(r => r.nrp)

    if (pjoNrps.length === 0) {
      return NextResponse.json({
        error: 'Belum ada PJO yang di-set. Hubungi HRGA.'
      }, { status: 400 })
    }

    // Cari PJO yang site-nya sama
    const { data: allPjo } = await supabase
      .from('employees')
      .select('nrp, nama, site')
      .in('nrp', pjoNrps)
      .eq('status_karyawan', 'Aktif')

    if (!allPjo || allPjo.length === 0) {
      return NextResponse.json({
        error: 'PJO aktif tidak ditemukan. Hubungi HRGA.'
      }, { status: 400 })
    }

    const samePjo = allPjo.find((p: any) => p.site === karyawan?.site)
    const chosenPjo = samePjo || allPjo[0]

    // Cek overlap
    const { data: existing } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('nrp', session.nrp)
      .in('status_final', ['MENUNGGU_ATASAN', 'MENUNGGU_PJO', 'DISETUJUI'])

    const overlap = (existing || []).some((r: any) => {
      const s = new Date(r.tanggal_mulai + 'T00:00:00')
      const e = new Date(r.tanggal_selesai + 'T00:00:00')
      return start <= e && s <= end
    })

    if (overlap) {
      return NextResponse.json({ error: 'Tanggal bentrok dengan cuti Anda yang lain' }, { status: 400 })
    }

    // Insert — direct-to-PJO: skip tahap atasan
    const { data: newLeave, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        nrp: session.nrp,
        tanggal_mulai,
        tanggal_selesai,
        jumlah_hari: jumlahHari,
        jenis_cuti,
        alasan,
        atasan_nrp: isDirectPJO ? chosenPjo.nrp : atasan_nrp,
        pjo_nrp: chosenPjo.nrp,
        status_atasan: isDirectPJO ? 'APPROVED' : 'PENDING',
        status_pjo: isDirectPJO ? 'PENDING' : 'WAITING',
        status_final: isDirectPJO ? 'MENUNGGU_PJO' : 'MENUNGGU_ATASAN'
      })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    await supabase.from('approval_logs').insert({
      leave_request_id: newLeave.id,
      approver_nrp: session.nrp,
      stage: 'SUBMITTED',
      action: 'SUBMITTED',
      catatan: alasan
    })

    return NextResponse.json({
      success: true,
      message: isDirectPJO
        ? `Pengajuan cuti ${jumlahHari} hari berhasil dibuat. Langsung menunggu approval PJO (${chosenPjo.nama}).`
        : `Pengajuan cuti ${jumlahHari} hari berhasil dibuat. Menunggu approval atasan (${atasanCheck?.nama}), lalu final ke PJO (${chosenPjo.nama}).`,
      data: newLeave
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}