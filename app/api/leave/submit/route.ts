import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

const JENIS_CUTI_REGULER = 'CUTI REGULER / ROSTER'
const JENIS_CUTI_TAHUNAN = 'CUTI TAHUNAN'
const JENIS_CUTI_KOMPENSASI = 'CUTI KOMPENSASI'
const STATUS_TIKET_DEFAULT = 'MENUNGGU_PEMESANAN'

function normalizeJenisCuti(value: string): string {
  const raw = String(value || '').trim().toUpperCase()

  if (!raw) return ''
  if (raw.includes('TAHUN')) return JENIS_CUTI_TAHUNAN
  if (raw.includes('KOMPENSASI')) return JENIS_CUTI_KOMPENSASI
  if (raw.includes('ROSTER') || raw.includes('REGULER')) return JENIS_CUTI_REGULER

  // fallback aman agar form lama tidak langsung jebol
  return JENIS_CUTI_REGULER
}

function hitungHariKalender(tanggalMulai: string, tanggalSelesai: string): number {
  const start = new Date(`${tanggalMulai}T00:00:00`)
  const end = new Date(`${tanggalSelesai}T00:00:00`)
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    try {
    const body = await request.json()
    const {
     tanggal_mulai,
     tanggal_selesai,
     jenis_cuti,
     alasan,
     atasan_nrp,
     jumlah_hari,
     butuh_tiket,
     tiket_berangkat_tanggal,
     tiket_berangkat_tujuan,
     tiket_kembali_tanggal,
     tiket_kembali_tujuan,
  // Cuti Kompensasi
     kompensasi_mulai,
    kompensasi_selesai,
    reguler_mulai,
    reguler_selesai,
    roster_cr_tanggal
    } = body

    if (!jenis_cuti || !alasan) {
  return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
}

// Untuk kompensasi, tanggal_mulai/selesai dihitung dari 2 blok
// Untuk jenis lain, tanggal_mulai/selesai wajib ada
const normalizedJenisCutiEarly = normalizeJenisCuti(jenis_cuti)
const isKompensasi = normalizedJenisCutiEarly === JENIS_CUTI_KOMPENSASI

if (!isKompensasi && (!tanggal_mulai || !tanggal_selesai)) {
  return NextResponse.json({ error: 'Tanggal mulai dan selesai wajib diisi' }, { status: 400 })
}

if (isKompensasi) {
  if (!kompensasi_mulai || !kompensasi_selesai || !reguler_mulai || !reguler_selesai) {
    return NextResponse.json({
      error: 'Cuti Kompensasi wajib mengisi blok kompensasi dan blok reguler'
    }, { status: 400 })
  }
}

    const normalizedJenisCuti = normalizeJenisCuti(jenis_cuti)
if (!normalizedJenisCuti) {
  return NextResponse.json({ error: 'Jenis cuti tidak valid' }, { status: 400 })
}

// ── Hitung tanggal efektif & validasi per jenis ──────────────────────────
let effectiveMulai: string
let effectiveSelesai: string
let hariKalender: number

if (isKompensasi) {
  // Validasi format tanggal blok kompensasi
  const kStart = new Date(`${kompensasi_mulai}T00:00:00`)
  const kEnd   = new Date(`${kompensasi_selesai}T00:00:00`)
  const rStart = new Date(`${reguler_mulai}T00:00:00`)
  const rEnd   = new Date(`${reguler_selesai}T00:00:00`)

  if ([kStart, kEnd, rStart, rEnd].some(d => isNaN(d.getTime()))) {
    return NextResponse.json({ error: 'Format tanggal blok kompensasi/reguler tidak valid' }, { status: 400 })
  }

  // Masing-masing blok harus urut
  if (kEnd < kStart) {
    return NextResponse.json({ error: 'Tanggal selesai kompensasi harus >= tanggal mulai kompensasi' }, { status: 400 })
  }
  if (rEnd < rStart) {
    return NextResponse.json({ error: 'Tanggal selesai reguler harus >= tanggal mulai reguler' }, { status: 400 })
  }

  // Validasi berurutan tanpa jeda (blok A selesai → blok B mulai besoknya)
  // Tentukan mana yang lebih dulu
  const blok1End   = kStart <= rStart ? kEnd   : rEnd
  const blok2Start = kStart <= rStart ? rStart : kStart

  const selisihHari = Math.floor(
    (blok2Start.getTime() - blok1End.getTime()) / 86400000
  )

  if (selisihHari !== 1) {
    return NextResponse.json({
      error: `Blok kompensasi dan reguler harus berurutan tanpa jeda. Selisih antar blok: ${selisihHari} hari (harus tepat 1 hari)`
    }, { status: 400 })
  }

  // Tanggal efektif = gabungan dua blok (paling awal → paling akhir)
  const allDates = [kStart, kEnd, rStart, rEnd]
  const minDate  = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate  = new Date(Math.max(...allDates.map(d => d.getTime())))

  effectiveMulai   = minDate.toISOString().split('T')[0]
  effectiveSelesai = maxDate.toISOString().split('T')[0]
  hariKalender     = hitungHariKalender(effectiveMulai, effectiveSelesai)

} else {
  // Jenis cuti biasa (reguler / tahunan)
  const start = new Date(`${tanggal_mulai}T00:00:00`)
  const end   = new Date(`${tanggal_selesai}T00:00:00`)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
  }
  if (end < start) {
    return NextResponse.json({ error: 'Tanggal selesai harus >= tanggal mulai' }, { status: 400 })
  }

  effectiveMulai   = tanggal_mulai
  effectiveSelesai = tanggal_selesai
  hariKalender     = hitungHariKalender(tanggal_mulai, tanggal_selesai)
}

if (hariKalender <= 0) {
  return NextResponse.json({ error: 'Rentang tanggal tidak valid' }, { status: 400 })
}

    const { data: empInfo } = await supabase
      .from('employees')
      .select('site, departemen, jabatan, eligible_tiket_pesawat')
      .eq('nrp', session.nrp)
      .single()

    if (!empInfo) {
      return NextResponse.json({ error: 'Data karyawan tidak ditemukan' }, { status: 404 })
    }

    const userJabatan = (empInfo.jabatan || '').toLowerCase()
    const isDirectPJO =
      userJabatan.includes('she') ||
      userJabatan.includes('hrga') ||
      userJabatan.includes('hr ') ||
      userJabatan.includes('admin') ||
      userJabatan.includes('gl ') ||
      userJabatan.includes('supervisor') ||
      userJabatan.includes('manager')

    const wantsTicket = Boolean(butuh_tiket)
    const eligibleTiket = !!empInfo.eligible_tiket_pesawat

    if (wantsTicket && !eligibleTiket) {
      return NextResponse.json({ error: 'Anda tidak memiliki hak pengajuan tiket pesawat' }, { status: 400 })
    }

    if (wantsTicket) {
      if (
        !tiket_berangkat_tanggal ||
        !tiket_berangkat_tujuan ||
        !tiket_kembali_tanggal ||
        !tiket_kembali_tujuan
      ) {
        return NextResponse.json({
          error: 'Field tiket berangkat & kembali wajib lengkap jika checkbox tiket dicentang'
        }, { status: 400 })
      }

      const tglBerangkat = new Date(`${tiket_berangkat_tanggal}T00:00:00`)
      const tglKembali = new Date(`${tiket_kembali_tanggal}T00:00:00`)

      if (isNaN(tglBerangkat.getTime()) || isNaN(tglKembali.getTime())) {
        return NextResponse.json({ error: 'Tanggal tiket tidak valid' }, { status: 400 })
      }

      if (tglKembali < tglBerangkat) {
        return NextResponse.json({ error: 'Tanggal tiket kembali tidak boleh lebih awal dari tiket berangkat' }, { status: 400 })
      }
    }

    // Gunakan effectiveMulai/Selesai untuk sisa proses
const start = new Date(`${effectiveMulai}T00:00:00`)
const end   = new Date(`${effectiveSelesai}T00:00:00`)
const tahunCuti = start.getFullYear()

    const { data: balanceRow } = await supabase
      .from('annual_leave_balances')
      .select('hak_awal, terpakai, penyesuaian')
      .eq('nrp', session.nrp)
      .eq('tahun', tahunCuti)
      .maybeSingle()

    const sisaCutiTahunan = Math.max(
      0,
      balanceRow
        ? Number(balanceRow.hak_awal || 12) +
            Number(balanceRow.penyesuaian || 0) -
            Number(balanceRow.terpakai || 0)
        : 12
    )

    let finalJumlahHari = hariKalender

    if (normalizedJenisCuti === JENIS_CUTI_TAHUNAN) {
      // fallback aman sementara: kalau frontend lama belum kirim jumlah_hari,
      // pakai hari kalender agar production tidak langsung putus
      if (jumlah_hari === undefined || jumlah_hari === null || jumlah_hari === '') {
        finalJumlahHari = hariKalender
      } else {
        const jumlahHariInput = Number(jumlah_hari)

        if (!Number.isInteger(jumlahHariInput) || jumlahHariInput <= 0) {
          return NextResponse.json({ error: 'Jumlah hari cuti tahunan wajib angka bulat lebih dari 0' }, { status: 400 })
        }

        if (jumlahHariInput > hariKalender) {
          return NextResponse.json({
            error: `Jumlah hari cuti tahunan (${jumlahHariInput}) tidak boleh melebihi rentang tanggal (${hariKalender} hari kalender)`
          }, { status: 400 })
        }

        finalJumlahHari = jumlahHariInput
      }

      if (finalJumlahHari > sisaCutiTahunan) {
        return NextResponse.json({
          error: `Sisa cuti tahunan tidak mencukupi. Sisa Anda ${sisaCutiTahunan} hari`
        }, { status: 400 })
      }
    }

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

    const { data: pjoRoles } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', 'pjo_site')
      .eq('active', true)

    const pjoNrps = (pjoRoles || []).map((r: any) => r.nrp)

    if (pjoNrps.length === 0) {
      return NextResponse.json({ error: 'Belum ada PJO yang di-set. Hubungi HRGA.' }, { status: 400 })
    }

    const { data: allPjo } = await supabase
      .from('employees')
      .select('nrp, nama, site')
      .in('nrp', pjoNrps)
      .eq('status_karyawan', 'Aktif')

    if (!allPjo || allPjo.length === 0) {
      return NextResponse.json({ error: 'PJO aktif tidak ditemukan. Hubungi HRGA.' }, { status: 400 })
    }

    const samePjo = allPjo.find((p: any) => p.site === empInfo.site)
    const chosenPjo = samePjo || allPjo[0]

    const { data: existing } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('nrp', session.nrp)
      .in('status_final', ['MENUNGGU_ATASAN', 'MENUNGGU_PJO', 'DISETUJUI'])

    const overlap = (existing || []).some((r: any) => {
      const s = new Date(`${r.tanggal_mulai}T00:00:00`)
      const e = new Date(`${r.tanggal_selesai}T00:00:00`)
      return start <= e && s <= end
    })

    if (overlap) {
      return NextResponse.json({ error: 'Tanggal bentrok dengan cuti Anda yang lain' }, { status: 400 })
    }

    const { data: newLeave, error: insertError } = await supabase
  .from('leave_requests')
  .insert({
    nrp: session.nrp,
    tanggal_mulai: effectiveMulai,
    tanggal_selesai: effectiveSelesai,
    jumlah_hari: finalJumlahHari,
    jenis_cuti: normalizedJenisCuti,
    alasan,
    atasan_nrp: isDirectPJO ? chosenPjo.nrp : atasan_nrp,
    pjo_nrp: chosenPjo.nrp,
    status_atasan: isDirectPJO ? 'APPROVED' : 'PENDING',
    status_pjo: isDirectPJO ? 'PENDING' : 'WAITING',
    status_final: isDirectPJO ? 'MENUNGGU_PJO' : 'MENUNGGU_ATASAN',
    butuh_tiket: wantsTicket,
    sisa_cuti_tahunan_snapshot: normalizedJenisCuti === JENIS_CUTI_TAHUNAN ? sisaCutiTahunan : null,
    // Kolom khusus cuti kompensasi
    kompensasi_mulai: isKompensasi ? kompensasi_mulai : null,
    kompensasi_selesai: isKompensasi ? kompensasi_selesai : null,
    reguler_mulai: isKompensasi ? reguler_mulai : null,
    reguler_selesai: isKompensasi ? reguler_selesai : null,
    roster_cr_tanggal: isKompensasi ? (roster_cr_tanggal || null) : null
  })
  .select()
  .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (wantsTicket) {
      const { error: ticketError } = await supabase
        .from('leave_tickets')
        .insert([
          {
            leave_request_id: newLeave.id,
            nrp: session.nrp,
            site: empInfo.site || null,
            trip_type: 'BERANGKAT',
            tanggal: tiket_berangkat_tanggal,
            tujuan: tiket_berangkat_tujuan,
            status: STATUS_TIKET_DEFAULT
          },
          {
            leave_request_id: newLeave.id,
            nrp: session.nrp,
            site: empInfo.site || null,
            trip_type: 'KEMBALI',
            tanggal: tiket_kembali_tanggal,
            tujuan: tiket_kembali_tujuan,
            status: STATUS_TIKET_DEFAULT
          }
        ])

      if (ticketError) {
        await supabase.from('leave_requests').delete().eq('id', newLeave.id)
        return NextResponse.json({
          error: `Pengajuan cuti gagal menyimpan tiket: ${ticketError.message}`
        }, { status: 500 })
      }
    }

    await supabase.from('approval_logs').insert({
      leave_request_id: newLeave.id,
      approver_nrp: session.nrp,
      stage: 'SUBMITTED',
      action: 'SUBMITTED',
      catatan: alasan
    })

    const tiketMessage = wantsTicket
      ? ' Permintaan tiket pesawat sudah masuk daftar pemesanan.'
      : ''

    return NextResponse.json({
      success: true,
      message: isDirectPJO
        ? `Pengajuan cuti ${finalJumlahHari} hari berhasil dibuat. Langsung menunggu approval PJO (${chosenPjo.nama}).${tiketMessage}`
        : `Pengajuan cuti ${finalJumlahHari} hari berhasil dibuat. Menunggu approval atasan (${atasanCheck?.nama}), lalu final ke PJO (${chosenPjo.nama}).${tiketMessage}`,
      data: newLeave
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}