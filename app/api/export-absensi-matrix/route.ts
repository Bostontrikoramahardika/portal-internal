// app/api/export-absensi-matrix/route.ts
// EXPORT REKAP ABSENSI — MATRIX (Excel berwarna, full 1 bulan)
//
// Logika kode sel DISAMAKAN dengan tampilan Matriks di aplikasi:
//   [MANUAL:xx] → cuti/izin approved → eviden → status attendance → TS Opt → roster → A

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function canExport(session: any): boolean {
  if (session?.is_super_admin) return true
  const roles = (session?.roles || []).map((r: string) => String(r).toLowerCase())
  return roles.some((r: string) =>
    ['hr_ho', 'hr_site', 'hrga', 'hrga_pusat', 'hrga_site', 'admin', 'admin_site',
     'admin_plant', 'pjo_site', 'pjo', 'manager_ops', 'director_ops'].includes(r)
  )
}

const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember']

function tglStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || ''
    const token = request.cookies.get('session_token')?.value ||
      (auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '')
    if (!token) return NextResponse.json({ error: 'Sesi tidak ditemukan — silakan login ulang' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Sesi kedaluwarsa — silakan login ulang' }, { status: 401 })
    if (!canExport(session)) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const periode = searchParams.get('periode') ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const siteFilter = searchParams.get('site') || ''

    const [thS, blS] = periode.split('-')
    const tahun = Number(thS)
    const bulan = Number(blS)

    // ── SELALU FULL 1 BULAN (1 s.d. 30/31) ──
    const jmlHari = new Date(tahun, bulan, 0).getDate()

    // batas hari yang datanya sudah ada:
    // bulan berjalan → sampai hari ini, bulan lampau → full, bulan depan → 0
    const bulanIni = new Date(now.getFullYear(), now.getMonth(), 1)
    const bulanPeriode = new Date(tahun, bulan - 1, 1)
    let batasIsi = jmlHari
    if (bulanPeriode.getTime() === bulanIni.getTime()) batasIsi = now.getDate()
    else if (bulanPeriode > bulanIni) batasIsi = 0

    const awal = tglStr(tahun, bulan, 1)
    const akhirData = tglStr(tahun, bulan, jmlHari)

    // ══════════════ 1. ROSTER ══════════════
    const { data: rosterRaw } = await supabaseAdmin
      .from('rosters')
      .select('nrp, tanggal, shift_code')
      .gte('tanggal', awal).lte('tanggal', akhirData)

    if (!rosterRaw || rosterRaw.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data roster untuk periode ini' }, { status: 404 })
    }

    // ══════════════ 2. KARYAWAN ══════════════
    const nrpRoster = Array.from(new Set(rosterRaw.map((r: any) => String(r.nrp))))
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, email, status_karyawan, tanggal_resign')
      .in('nrp', nrpRoster)

    const empMap = new Map<string, any>()
    ;(employees || []).forEach((e: any) => empMap.set(String(e.nrp), e))

    let validNrps = nrpRoster.filter((n) => empMap.has(n))
    if (siteFilter && siteFilter !== 'ALL' && siteFilter !== 'Semua Site') {
      validNrps = validNrps.filter((n) => String(empMap.get(n).site || '') === siteFilter)
    }
    if (!validNrps.length) {
      return NextResponse.json({ error: 'Tidak ada karyawan valid untuk filter ini' }, { status: 404 })
    }

    // helper query berkala 200 NRP
    async function ambilBerkala(tabel: string, kolom: string, tambahan?: (q: any) => any) {
      let hasil: any[] = []
      for (let i = 0; i < validNrps.length; i += 200) {
        const potong = validNrps.slice(i, i + 200)
        let q: any = supabaseAdmin.from(tabel).select(kolom).in('nrp', potong)
          .gte('tanggal', awal).lte('tanggal', akhirData)
        if (tambahan) q = tambahan(q)
        const { data, error } = await q
        if (error) throw new Error(`${tabel}: ${error.message}`)
        if (data?.length) hasil = hasil.concat(data)
      }
      return hasil
    }

    // ══════════════ 3. ATTENDANCE ══════════════
    let attAll: any[] = []
    for (let i = 0; i < validNrps.length; i += 200) {
      const { data } = await supabaseAdmin
        .from('attendance')
        .select('nrp, tanggal, shift, clock_in, clock_out, status, keterangan, jam_kerja_menit')
        .in('nrp', validNrps.slice(i, i + 200))
        .gte('tanggal', awal).lte('tanggal', akhirData)
      attAll = attAll.concat(data || [])
    }

    // ══════════════ 4. TS OPT ══════════════
    const tsKode = new Map<string, { kode: 'DS' | 'NS'; unit: string | null }>()
    const normNama = (s: any) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    try {
      const tsAll = await ambilBerkala('ts_opt', 'tanggal, nrp, nama_operator, shift, kode_unit')
      for (const r of tsAll) {
        const tgl = String(r.tanggal || '').slice(0, 10)
        if (!tgl) continue
        const sh = String(r.shift ?? '').toUpperCase()
        const kode: 'DS' | 'NS' =
          sh === '2' || sh.includes('MALAM') || sh === 'NS' || sh.includes('NIGHT') ? 'NS' : 'DS'
        const isi = { kode, unit: r.kode_unit || null }
        const nr = String(r.nrp || '').trim()
        if (nr) {
          tsKode.set(`${tgl}|NRP:${nr}`, isi)
          tsKode.set(`${tgl}|NRP:${nr.replace(/^B/i, '')}`, isi)
        }
        const nm = normNama(r.nama_operator)
        if (nm) tsKode.set(`${tgl}|NM:${nm}`, isi)
      }
    } catch { /* ts_opt belum ada / kolom beda */ }

    // ══════════════ 5. CUTI / IZIN / EVIDEN / LEMBUR ══════════════
    let leaves: any[] = []
    for (let i = 0; i < validNrps.length; i += 200) {
      const { data } = await supabaseAdmin
        .from('leave_requests')
        .select('nrp, tanggal_mulai, tanggal_selesai, jenis_cuti, status_final')
        .in('nrp', validNrps.slice(i, i + 200))
        .lte('tanggal_mulai', akhirData).gte('tanggal_selesai', awal)
      if (data?.length) leaves = leaves.concat(data)
    }

    let evidences: any[] = []
    try {
      evidences = await ambilBerkala('attendance_evidences', 'nrp, tanggal, kategori, status_atasan')
    } catch { /* tabel eviden belum ada */ }

    let lemburRows: any[] = []
    try {
      lemburRows = await ambilBerkala('overtime_requests',
        'nrp, tanggal, jam_mulai, jam_selesai, total_jam, jenis_lembur, alasan, status_final, status_atasan, status_pjo')
    } catch { /* tabel lembur belum ada */ }

    // ══════════════ 5b. KOMPENSASI CUTI (input manual HR) ══════════════
    const kompMap = new Map<string, { hari: number; keterangan: string; oleh: string }>()
    try {
      const { data: kompAll } = await supabaseAdmin
        .from('kompensasi_cuti')
        .select('nrp, jumlah_hari, keterangan, diubah_oleh')
        .eq('periode', `${tahun}-${String(bulan).padStart(2, '0')}`)
      ;(kompAll || []).forEach((k: any) => {
        kompMap.set(String(k.nrp), {
          hari: Number(k.jumlah_hari) || 0,
          keterangan: String(k.keterangan || ''),
          oleh: String(k.diubah_oleh || ''),
        })
      })
    } catch { /* tabel kompensasi_cuti belum dibuat → anggap kosong */ }

    const lemburJam: Record<string, number> = {}
    const lemburKali: Record<string, number> = {}
    const lemburPerHari = new Map<string, number>()
    for (const l of lemburRows) {
      const fin = String(l.status_final || '').toUpperCase()
      const ata = String(l.status_atasan || '').toUpperCase()
      const pjo = String(l.status_pjo || '').toUpperCase()
      const disetujui = (fin.includes('APPROVED') || fin.includes('DISETUJUI')) ||
        (ata === 'APPROVED' && pjo === 'APPROVED') || ata === 'APPROVED'
      if (!disetujui) continue
      const k = String(l.nrp)
      lemburKali[k] = (lemburKali[k] || 0) + 1
      let jam = Number(l.total_jam || 0)
      if (!jam && l.jam_mulai && l.jam_selesai) {
        const [h1, m1] = String(l.jam_mulai).split(':').map(Number)
        const [h2, m2] = String(l.jam_selesai).split(':').map(Number)
        let menit = (h2 * 60 + m2) - (h1 * 60 + m1)
        if (menit < 0) menit += 1440
        jam = Math.round((menit / 60) * 100) / 100
      }
      lemburJam[k] = Math.round(((lemburJam[k] || 0) + jam) * 100) / 100
      const kh = `${k}|${String(l.tanggal).slice(0, 10)}`
      lemburPerHari.set(kh, Math.round(((lemburPerHari.get(kh) || 0) + jam) * 100) / 100)
    }

    // ══════════════ 6. MAP PENCARIAN ══════════════
    const rosterMap = new Map<string, string>()
    rosterRaw.forEach((r: any) => rosterMap.set(`${r.nrp}|${String(r.tanggal).slice(0, 10)}`, String(r.shift_code || '').toUpperCase()))

    const attMap = new Map<string, any>()
    attAll.forEach((a: any) => attMap.set(`${a.nrp}|${String(a.tanggal).slice(0, 10)}`, a))

    const leaveMap = new Map<string, string>()
    ;(leaves || []).forEach((lr: any) => {
      const st = new Date(`${lr.tanggal_mulai}T00:00:00`)
      const en = new Date(`${lr.tanggal_selesai}T00:00:00`)
      for (let d = new Date(st); d <= en; d.setDate(d.getDate() + 1)) {
        leaveMap.set(`${lr.nrp}|${d.toISOString().slice(0, 10)}`, lr.jenis_cuti || '')
      }
    })

    const evMap = new Map<string, string>()
    ;(evidences || []).forEach((ev: any) => {
      if (String(ev.status_atasan || '').toUpperCase() !== 'APPROVED') return
      evMap.set(`${ev.nrp}|${String(ev.tanggal).slice(0, 10)}`, ev.kategori || '')
    })

    // ══════════════ 7. TENTUKAN KODE (sama dengan aplikasi) ══════════════
    function cariTs(nrp: string, nama: string, tgl: string) {
      return tsKode.get(`${tgl}|NRP:${nrp}`)
        || tsKode.get(`${tgl}|NRP:${nrp.replace(/^B/i, '')}`)
        || tsKode.get(`${tgl}|NM:${normNama(nama)}`)
        || null
    }

    function tentukanKode(nrp: string, nama: string, tgl: string): string {
      const key = `${nrp}|${tgl}`
      const att = attMap.get(key)
      const roster = String(rosterMap.get(key) || '').toUpperCase()
      const leave = String(leaveMap.get(key) || '').toUpperCase()
      const ev = String(evMap.get(key) || '').toUpperCase()
      const ts = cariTs(nrp, nama, tgl)

      const manual = String(att?.keterangan || '').match(/\[MANUAL:([A-Za-z]+)\]/i)
      if (manual) return manual[1].toUpperCase()

      if (leave) {
        if (leave.includes('TAHUN')) return 'CT'
        if (leave.includes('KOMPENSASI')) {
          if (att?.clock_in) return String(att.shift || '').toUpperCase().includes('MALAM') ? 'MCK' : 'SCK'
          if (ts) return ts.kode === 'NS' ? 'MCK' : 'SCK'
          return 'CR'
        }
        if (leave.includes('ROSTER') || leave.includes('REGULER')) return 'CR'
        return 'I'
      }

      if (ev) {
        if (ev.includes('SAKIT')) return 'S'
        if (ev.includes('BERBAYAR')) return 'IR'
        if (ev.includes('IZIN')) return 'I'
      }

      const st = String(att?.status || '').toUpperCase()
      const sh = String(att?.shift || '').toUpperCase()
      if (st === 'HADIR' || st === 'TERLAMBAT' || st === 'SETENGAH_HARI') {
        return sh.includes('MALAM') ? 'NS' : 'DS'
      }
      if (st === 'ALPHA') return 'A'
      if (st === 'IZIN') return 'I'
      if (st === 'SAKIT') return 'S'
      if (st === 'CUTI') return 'CT'
      if (st === 'LIBUR') return 'OFF'

      if (ts) return att?.clock_in ? ts.kode : (ts.kode === 'NS' ? 'NW' : 'DW')

      if (roster === 'OFF') return 'OFF'
      if (roster === 'ID') return 'ID'
      if (roster === 'TR') return 'TR'
      if (roster === 'CR') return 'CR'
      if (roster === 'CT' || roster === 'LV') return 'CT'

      if (roster === 'S' || roster === 'M') return 'A'

      return ''
    }

    // ══════════════ 8. SUSUN BARIS ══════════════
    validNrps.sort((a, b) => String(empMap.get(a)?.nama || '').localeCompare(String(empMap.get(b)?.nama || '')))

    const barisMatriks: any[] = []
    const hitung: Record<string, any> = {}

    for (const nrp of validNrps) {
      const emp = empMap.get(nrp)
      const kodes: string[] = []
      const c: any = { HDR: 0, DS: 0, NS: 0, CT: 0, CR: 0, KMP: 0, KMPC: 0, S: 0, I: 0, IR: 0, A: 0, OFF: 0, TOTAL_KERJA: 0 }
      for (let d = 1; d <= jmlHari; d++) {
        // hari yang belum terjadi → sel dibiarkan KOSONG (bukan A)
        if (d > batasIsi) { kodes.push(''); continue }
        const kode = tentukanKode(nrp, emp?.nama || '', tglStr(tahun, bulan, d))
        kodes.push(kode)
        if (kode === 'DS' || kode === 'NS') { c.HDR++; c.TOTAL_KERJA++; kode === 'DS' ? c.DS++ : c.NS++ }
        else if (kode === 'DW' || kode === 'NW') { c.HDR++; c.TOTAL_KERJA++ }
        else if (kode === 'SCK' || kode === 'MCK') { c.KMP++; c.HDR++; c.TOTAL_KERJA++ }
        else if (kode === 'CT') { c.CT++; c.TOTAL_KERJA++ }
        else if (kode === 'CR') { c.CR++ }
        else if (kode === 'S') { c.S++; c.TOTAL_KERJA++ }
        else if (kode === 'I') { c.I++; c.TOTAL_KERJA++ }
        else if (kode === 'IR') { c.IR++; c.TOTAL_KERJA++ }
        else if (kode === 'A') { c.A++; c.TOTAL_KERJA++ }
        else if (kode === 'OFF') { c.OFF++ }
      }
      c.KMPC = kompMap.get(String(nrp))?.hari || 0
      hitung[nrp] = c
      barisMatriks.push({
        nrp,
        nama: emp?.nama || '',
        jabatan: emp?.jabatan || emp?.departemen || '-',
        site: emp?.site || '-',
        kode: kodes,
      })
    }

    // ══════════════ 9. TULIS EXCEL ══════════════
    const KODE: Record<string, { label: string; bg: string; fg: string }> = {
      DS:  { label: 'Day Shift',             bg: 'FFE0F2FE', fg: 'FF075985' },
      NS:  { label: 'Night Shift',           bg: 'FFEDE9FE', fg: 'FF5B21B6' },
      OFF: { label: 'Off / Libur',           bg: 'FFF1F5F9', fg: 'FF475569' },
      CR:  { label: 'Cuti Roster',           bg: 'FFFEF9C3', fg: 'FF854D0E' },
      CT:  { label: 'Cuti Tahunan',          bg: 'FFFED7AA', fg: 'FF7C2D12' },
      SCK: { label: 'Shift Cuti Kompensasi', bg: 'FFA7F3D0', fg: 'FF065F46' },
      MCK: { label: 'Malam Cuti Kompensasi', bg: 'FF6EE7B7', fg: 'FF064E3B' },
      TR:  { label: 'Training',              bg: 'FFBFDBFE', fg: 'FF1E3A8A' },
      ID:  { label: 'Induksi',               bg: 'FFC7D2FE', fg: 'FF312E81' },
      S:   { label: 'Sakit',                 bg: 'FFFBCFE8', fg: 'FF831843' },
      I:   { label: 'Izin Potongan',         bg: 'FFFCE7F3', fg: 'FF9D174D' },
      IR:  { label: 'Izin Resmi',            bg: 'FFFFE4E6', fg: 'FF9F1239' },
      A:   { label: 'Alfa',                  bg: 'FFF87171', fg: 'FFFFFFFF' },
      DW:  { label: 'Day (tanpa TS Opt)',    bg: 'FFF0F9FF', fg: 'FF075985' },
      NW:  { label: 'Night (tanpa TS Opt)',  bg: 'FFF5F3FF', fg: 'FF5B21B6' },
    }
    const NAVY = 'FF003D79'
    const NAVY2 = 'FF0B2A5B'
    const ORANGE = 'FFB45309'
    const garis = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
    const tipis = { top: garis, bottom: garis, left: garis, right: garis }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'BTM Mobile — Portal Internal'
    wb.created = new Date()

    // ══════════ SHEET 1 : REKAP MATRIX ══════════
    const ws = wb.addWorksheet('Rekap Absensi', { views: [{ state: 'frozen', xSplit: 5, ySplit: 5 }] })

    const KOL_NO = 1, KOL_NRP = 2, KOL_NAMA = 3, KOL_JAB = 4, KOL_SITE = 5
    const KOL_TGL1 = 6
    const kolomRingkas = ['HDR', 'DS', 'NS', 'CT', 'CR', 'KMP', 'KOMP.CUTI', 'S', 'I', 'IR', 'A', 'OFF', '%']
    const kolomLembur = ['KALI', 'JAM']
    const KOL_RINGKAS = KOL_TGL1 + jmlHari
    const KOL_AKHIR = KOL_RINGKAS + kolomRingkas.length + kolomLembur.length - 1

    const BARIS_JUDUL = 1
    const BARIS_INFO = 2
    const BARIS_GRUP = 3   // label "TANGGAL" / "REKAP KEHADIRAN" / "LEMBUR"
    const BARIS_TGL = 4    // angka 1..31
    const BARIS_HARI = 5   // nama hari
    const BARIS_DATA = 6

    // judul
    ws.mergeCells(BARIS_JUDUL, 1, BARIS_JUDUL, Math.min(KOL_AKHIR, 12))
    const cJudul = ws.getCell(BARIS_JUDUL, 1)
    cJudul.value = `REKAP ABSENSI — ${bulanNama[bulan - 1].toUpperCase()} ${tahun}`
    cJudul.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    cJudul.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cJudul.alignment = { vertical: 'middle' }
    ws.getRow(BARIS_JUDUL).height = 26

    ws.mergeCells(BARIS_INFO, 1, BARIS_INFO, Math.min(KOL_AKHIR, 12))
    const cInfo = ws.getCell(BARIS_INFO, 1)
    cInfo.value = `Site: ${siteFilter && siteFilter !== 'ALL' ? siteFilter : 'Semua Site'}   •   Periode: 01 – ${jmlHari} ${bulanNama[bulan - 1]} ${tahun}   •   Data terisi s.d. tanggal ${batasIsi || '-'}   •   Dicetak: ${new Date().toLocaleString('id-ID')}`
    cInfo.font = { size: 9, color: { argb: 'FF475569' } }
    cInfo.alignment = { vertical: 'middle' }
    ws.getRow(BARIS_INFO).height = 16

    // ── grup header ──
    const grupKolom: Array<[number, number, string, string]> = [
      [KOL_NO, KOL_NO, 'NO', NAVY],
      [KOL_NRP, KOL_NRP, 'NRP', NAVY],
      [KOL_NAMA, KOL_NAMA, 'NAMA KARYAWAN', NAVY],
      [KOL_JAB, KOL_JAB, 'JABATAN', NAVY],
      [KOL_SITE, KOL_SITE, 'SITE', NAVY],
      [KOL_TGL1, KOL_TGL1 + jmlHari - 1, 'TANGGAL', NAVY2],
      [KOL_RINGKAS, KOL_RINGKAS + kolomRingkas.length - 1, 'REKAP KEHADIRAN', NAVY],
      [KOL_RINGKAS + kolomRingkas.length, KOL_AKHIR, 'LEMBUR', ORANGE],
    ]
    for (const [k1, k2, label, warna] of grupKolom) {
      if (k2 > k1) ws.mergeCells(BARIS_GRUP, k1, BARIS_GRUP, k2)
      const sel = ws.getCell(BARIS_GRUP, k1)
      sel.value = label
      sel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: warna } }
      sel.alignment = { horizontal: 'center', vertical: 'middle' }
      sel.border = tipis
    }
    ws.getRow(BARIS_GRUP).height = 18

    // ── kolom tanggal: angka + nama hari ──
    for (let d = 1; d <= jmlHari; d++) {
      const tgl = new Date(tahun, bulan - 1, d)
      const kol = KOL_TGL1 + d - 1
      const akhirPekan = tgl.getDay() === 0 || tgl.getDay() === 6
      const lewat = d > batasIsi

      const selTgl = ws.getCell(BARIS_TGL, kol)
      const selHari = ws.getCell(BARIS_HARI, kol)
      selTgl.value = d
      selHari.value = hariNama[tgl.getDay()].slice(0, 3).toUpperCase()

      selTgl.font = { bold: true, size: 9, color: { argb: akhirPekan ? 'FFB91C1C' : 'FFFFFFFF' } }
      selTgl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: akhirPekan ? 'FFFECACA' : NAVY2 } }
      selTgl.alignment = { horizontal: 'center', vertical: 'middle' }

      selHari.font = { size: 7, color: { argb: akhirPekan ? 'FFB91C1C' : 'FFE2E8F0' }, bold: akhirPekan }
      selHari.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: akhirPekan ? 'FFFEE2E2' : 'FF1E3A5F' } }
      selHari.alignment = { horizontal: 'center', vertical: 'middle' }

      selTgl.border = tipis
      selHari.border = tipis
      if (lewat) selHari.font = { size: 7, color: { argb: 'FF94A3B8' } }
    }
    ws.getRow(BARIS_TGL).height = 16
    ws.getRow(BARIS_HARI).height = 13

    // header kolom ringkas & lembur
    ;[...kolomRingkas, ...kolomLembur].forEach((h, i) => {
      const kol = KOL_RINGKAS + i
      ws.mergeCells(BARIS_TGL, kol, BARIS_HARI, kol)
      const sel = ws.getCell(BARIS_TGL, kol)
      sel.value = h
      const warna = i >= kolomRingkas.length ? ORANGE : NAVY
      sel.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: warna } }
      sel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      sel.border = tipis
    })

    // ── baris data ──
    let r = BARIS_DATA
    barisMatriks.forEach((b, idx) => {
      const c = hitung[b.nrp]
      const row = ws.getRow(r)

      row.getCell(KOL_NO).value = idx + 1
      row.getCell(KOL_NRP).value = b.nrp
      row.getCell(KOL_NAMA).value = b.nama
      row.getCell(KOL_JAB).value = b.jabatan
      row.getCell(KOL_SITE).value = b.site

      for (const kol of [KOL_NO, KOL_NRP, KOL_NAMA, KOL_JAB, KOL_SITE]) {
        const sel = row.getCell(kol)
        sel.font = { size: 9, bold: kol === KOL_NAMA }
        sel.alignment = { horizontal: kol <= KOL_NRP ? 'center' : 'left', vertical: 'middle' }
        sel.border = tipis
      }

      for (let d = 0; d < jmlHari; d++) {
        const kode = b.kode[d] || ''
        const sel = row.getCell(KOL_TGL1 + d)
        const info = KODE[kode]
        sel.value = kode || null
        sel.alignment = { horizontal: 'center', vertical: 'middle' }
        sel.border = tipis
        sel.font = { size: 9, bold: !!info, color: { argb: info?.fg || 'FF0F172A' } }
        if (info) {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: info.bg } }
        } else {
          const tgl = new Date(tahun, bulan - 1, d + 1)
          if (tgl.getDay() === 0 || tgl.getDay() === 6) {
            sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
          }
        }
      }

      const persen = c.TOTAL_KERJA > 0 ? Math.round((c.HDR / c.TOTAL_KERJA) * 1000) / 10 : 0
      const nilai = [c.HDR, c.DS, c.NS, c.CT, c.CR, c.KMP, c.KMPC, c.S, c.I, c.IR, c.A, c.OFF, persen,
                     lemburKali[b.nrp] || 0, lemburJam[b.nrp] || 0]
      const namaKol = [...kolomRingkas, ...kolomLembur]
      nilai.forEach((v, i) => {
        const sel = row.getCell(KOL_RINGKAS + i)
        sel.value = v
        sel.alignment = { horizontal: 'center', vertical: 'middle' }
        sel.border = tipis
        sel.font = { size: 9, bold: true }
        const nk = namaKol[i]
        if (nk === '%') {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: persen >= 90 ? 'FFD1FAE5' : persen >= 70 ? 'FFFEF3C7' : 'FFFEE2E2' } }
        } else if (nk === 'A' && c.A > 0) {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
          sel.font = { size: 9, bold: true, color: { argb: 'FF991B1B' } }
        } else if (i >= kolomRingkas.length) {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: Number(v) > 0 ? 'FFFEF3C7' : 'FFF8FAFC' } }
        } else {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        }
      })

      r++
    })

    // ── baris total ──
    const barisTotal = r
    ws.getRow(barisTotal).height = 18
    ws.mergeCells(barisTotal, KOL_NO, barisTotal, KOL_SITE)
    const cTot = ws.getCell(barisTotal, KOL_NO)
    cTot.value = `TOTAL ${barisMatriks.length} KARYAWAN`
    cTot.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY2 } }
    cTot.alignment = { horizontal: 'center', vertical: 'middle' }
    cTot.border = tipis

    for (let d = 0; d < jmlHari; d++) {
      const sel = ws.getCell(barisTotal, KOL_TGL1 + d)
      const jml = barisMatriks.filter((b) => (b.kode[d] || '') === 'A').length
      sel.value = jml > 0 ? jml : null
      sel.font = { size: 8, bold: true, color: { argb: 'FF991B1B' } }
      sel.alignment = { horizontal: 'center', vertical: 'middle' }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }
      sel.border = tipis
    }
    const urutRingkas = ['HDR', 'DS', 'NS', 'CT', 'CR', 'KMP', 'KMPC', 'S', 'I', 'IR', 'A', 'OFF']
    urutRingkas.forEach((k, i) => {
      const v = barisMatriks.reduce((a, b) => a + (hitung[b.nrp][k] || 0), 0)
      const sel = ws.getCell(barisTotal, KOL_RINGKAS + i)
      sel.value = v
      sel.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY2 } }
      sel.alignment = { horizontal: 'center', vertical: 'middle' }
      sel.border = tipis
    })
    const selPersenTot = ws.getCell(barisTotal, KOL_RINGKAS + kolomRingkas.length - 1)
    selPersenTot.value = ''
    selPersenTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY2 } }
    selPersenTot.border = tipis

    const selKaliTot = ws.getCell(barisTotal, KOL_RINGKAS + kolomRingkas.length)
    selKaliTot.value = Object.values(lemburKali).reduce((a, b) => a + b, 0)
    const selJamTot = ws.getCell(barisTotal, KOL_RINGKAS + kolomRingkas.length + 1)
    selJamTot.value = Math.round(Object.values(lemburJam).reduce((a, b) => a + b, 0) * 100) / 100
    ;[selKaliTot, selJamTot].forEach((s) => {
      s.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } }
      s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } }
      s.alignment = { horizontal: 'center', vertical: 'middle' }
      s.border = tipis
    })

    // lebar kolom
    ws.getColumn(KOL_NO).width = 5
    ws.getColumn(KOL_NRP).width = 12
    ws.getColumn(KOL_NAMA).width = 28
    ws.getColumn(KOL_JAB).width = 20
    ws.getColumn(KOL_SITE).width = 10
    for (let d = 0; d < jmlHari; d++) ws.getColumn(KOL_TGL1 + d).width = 4.3
    for (let i = 0; i < kolomRingkas.length; i++) ws.getColumn(KOL_RINGKAS + i).width = 5.5
    ws.getColumn(KOL_RINGKAS + kolomRingkas.length).width = 9
    ws.getColumn(KOL_RINGKAS + kolomRingkas.length + 1).width = 10

    ws.autoFilter = { from: { row: BARIS_TGL, column: KOL_NO }, to: { row: BARIS_TGL, column: KOL_AKHIR } }

    // ══════════ SHEET 2 : LEGENDA ══════════
    const wl = wb.addWorksheet('Legenda')
    wl.getColumn(1).width = 8
    wl.getColumn(2).width = 32
    wl.mergeCells(1, 1, 1, 2)
    wl.getCell(1, 1).value = 'LEGENDA KODE ABSENSI'
    wl.getCell(1, 1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    wl.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    let rl = 3
    Object.entries(KODE).forEach(([kode, info]) => {
      const a = wl.getCell(rl, 1)
      a.value = kode
      a.font = { bold: true, color: { argb: info.fg } }
      a.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: info.bg } }
      a.alignment = { horizontal: 'center' }
      a.border = tipis
      const b = wl.getCell(rl, 2)
      b.value = info.label
      b.font = { size: 10 }
      b.border = tipis
      rl++
    })
    rl++
    const catatan = [
      'Catatan:',
      '• Kode diambil dari data yang sama dengan tampilan Matriks di aplikasi.',
      '• Koreksi manual HR (DS / NS / A / …) ditampilkan sesuai koreksi tersebut.',
      '• Kolom tanggal selalu penuh 1 bulan (01 s.d. akhir bulan).',
      '• Sel kosong = belum ada data (hari belum terjadi) atau tidak ada roster/absensi/TS Opt.',
    ]
    catatan.forEach((t) => {
      wl.mergeCells(rl, 1, rl, 2)
      const sel = wl.getCell(rl, 1)
      sel.value = t
      sel.font = { size: 9, bold: t === 'Catatan:', color: { argb: 'FF475569' } }
      rl++
    })

    // ══════════ SHEET 3 : DETAIL ══════════
    const wd = wb.addWorksheet('Detail Absensi', { views: [{ state: 'frozen', ySplit: 1 }] })
    const headerDetail = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE', 'TANGGAL', 'HARI', 'KODE',
      'JAM MASUK', 'JAM KELUAR', 'STATUS DB', 'KETERANGAN', 'LEMBUR (jam)']
    wd.addRow(headerDetail)
    wd.getRow(1).eachCell((sel) => {
      sel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
      sel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      sel.border = tipis
    })
    wd.getRow(1).height = 22

    let noDetail = 1
    for (const b of barisMatriks) {
      for (let d = 0; d < jmlHari; d++) {
        const kode = b.kode[d] || ''
        if (!kode) continue
        const tanggal = tglStr(tahun, bulan, d + 1)
        const att = attMap.get(`${b.nrp}|${tanggal}`)
        const info = KODE[kode]
        const row = wd.addRow([
          noDetail++, b.nrp, b.nama, b.jabatan, b.site,
          tanggal, hariNama[new Date(tahun, bulan - 1, d + 1).getDay()], kode,
          att?.clock_in ? new Date(att.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
          att?.clock_out ? new Date(att.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
          att?.status || '', String(att?.keterangan || '').replace(/\[MANUAL:[A-Za-z]+\]\s*/gi, '').trim(),
          lemburPerHari.get(`${b.nrp}|${tanggal}`) || '',
        ])
        const selKode = row.getCell(8)
        selKode.font = { bold: true, size: 9, color: { argb: info?.fg || 'FF0F172A' } }
        if (info) selKode.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: info.bg } }
        row.eachCell((sel) => {
          sel.border = tipis
          sel.alignment = { vertical: 'middle' }
          if (sel !== selKode) sel.font = { size: 9 }
        })
      }
    }
    ;[5, 12, 28, 20, 10, 12, 10, 7, 11, 11, 13, 30, 12].forEach((w, i) => (wd.getColumn(i + 1).width = w))
    wd.autoFilter = { from: 'A1', to: 'M1' }

    // ══════════ SHEET 4 : REKAP CUTI & LEMBUR ══════════
    // Satu baris per karyawan: tanggal hadir, tanggal+jenis lembur,
    // tanggal cuti, dan jumlah hari kompensasi cuti (input HR).
    const ws4 = wb.addWorksheet('Rekap Cuti & Lembur', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }],
    })
    const HIJAU = 'FF0E9384'
    const BIRU_CUTI = 'FFB45309'

    const header4 = [
      'NO', 'NRP', 'NAMA', 'JABATAN', 'SITE',
      'HADIR (hari)', 'TANGGAL HADIR',
      'LEMBUR (kali)', 'TANGGAL & JENIS LEMBUR',
      'CUTI (hari)', 'TANGGAL & JENIS CUTI',
      'KOMPENSASI CUTI (hari)', 'KETERANGAN KOMPENSASI',
    ]
    const jmlKol4 = header4.length

    ws4.mergeCells(1, 1, 1, jmlKol4)
    const j4 = ws4.getCell(1, 1)
    j4.value = `REKAP CUTI & LEMBUR — ${bulanNama[bulan - 1].toUpperCase()} ${tahun}`
    j4.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    j4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    j4.alignment = { vertical: 'middle' }
    ws4.getRow(1).height = 26

    ws4.mergeCells(2, 1, 2, jmlKol4)
    const i4 = ws4.getCell(2, 1)
    i4.value = `Site: ${siteFilter && siteFilter !== 'ALL' ? siteFilter : 'Semua Site'}   •   Periode: ${bulanNama[bulan - 1]} ${tahun}   •   Kompensasi cuti = input manual HR   •   Dicetak: ${new Date().toLocaleString('id-ID')}`
    i4.font = { size: 9, color: { argb: 'FF475569' } }
    ws4.getRow(2).height = 16

    // grup header
    const grup4: Array<[number, number, string, string]> = [
      [1, 5, 'KARYAWAN', NAVY],
      [6, 7, 'KEHADIRAN', 'FF0369A1'],
      [8, 9, 'LEMBUR', ORANGE],
      [10, 11, 'CUTI', BIRU_CUTI],
      [12, 13, 'KOMPENSASI CUTI', HIJAU],
    ]
    for (const [k1, k2, label, warna] of grup4) {
      if (k2 > k1) ws4.mergeCells(3, k1, 3, k2)
      const sel = ws4.getCell(3, k1)
      sel.value = label
      sel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: warna } }
      sel.alignment = { horizontal: 'center', vertical: 'middle' }
      sel.border = tipis
    }
    ws4.getRow(3).height = 18

    header4.forEach((h, i) => {
      const sel = ws4.getCell(4, i + 1)
      sel.value = h
      sel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY2 } }
      sel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      sel.border = tipis
    })
    ws4.getRow(4).height = 30
    ws4.getRow(4).commit?.()

    // helper tanggal: "03 Mei"
    const sd = (d: number) => String(d).padStart(2, '0')
    const tglRingkas = (tglStr2: string) => {
      const d = Number(String(tglStr2).slice(8, 10))
      return `${sd(d)} ${bulanNama[bulan - 1].slice(0, 3)}`
    }

    // lembur disetujui per karyawan
    const lemburPerOrang = new Map<string, Array<{ tanggal: string; jenis: string }>>()
    for (const l of lemburRows) {
      const fin = String(l.status_final || '').toUpperCase()
      const ata = String(l.status_atasan || '').toUpperCase()
      const pjo = String(l.status_pjo || '').toUpperCase()
      const disetujui = (fin.includes('APPROVED') || fin.includes('DISETUJUI')) ||
        (ata === 'APPROVED' && pjo === 'APPROVED') || ata === 'APPROVED'
      if (!disetujui) continue
      const k = String(l.nrp)
      if (!lemburPerOrang.has(k)) lemburPerOrang.set(k, [])
      lemburPerOrang.get(k)!.push({
        tanggal: String(l.tanggal).slice(0, 10),
        jenis: String(l.jenis_lembur || 'BIASA').toUpperCase(),
      })
    }
    lemburPerOrang.forEach((arr) => arr.sort((x, y) => x.tanggal.localeCompare(y.tanggal)))

    // cuti disetujui per karyawan (dalam periode)
    const cutiPerOrang = new Map<string, Array<{ tanggal: string; jenis: string }>>()
    for (const lr of leaves) {
      const fin = String(lr.status_final || '').toUpperCase()
      const sudahFinal = fin.includes('DISETUJUI') || fin.includes('APPROVED')
      if (!sudahFinal) continue
      const k = String(lr.nrp)
      const jenis = String(lr.jenis_cuti || 'CUTI').toUpperCase()
      const st = new Date(`${String(lr.tanggal_mulai).slice(0, 10)}T00:00:00`)
      const en = new Date(`${String(lr.tanggal_selesai).slice(0, 10)}T00:00:00`)
      for (let d = new Date(st); d <= en; d.setDate(d.getDate() + 1)) {
        const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (t < awal || t > akhirData) continue
        if (!cutiPerOrang.has(k)) cutiPerOrang.set(k, [])
        cutiPerOrang.get(k)!.push({ tanggal: t, jenis })
      }
    }
    cutiPerOrang.forEach((arr) => arr.sort((x, y) => x.tanggal.localeCompare(y.tanggal)))

    let r4 = 5
    barisMatriks.forEach((b, idx) => {
      const c = hitung[b.nrp]
      // tanggal hadir
      const tglHadir: string[] = []
      const tglCuti: string[] = []
      for (let d = 0; d < jmlHari; d++) {
        const kode = b.kode[d] || ''
        if (['DS', 'NS', 'DW', 'NW', 'SCK', 'MCK'].includes(kode)) tglHadir.push(sd(d + 1))
        if (['CT', 'CR'].includes(kode)) tglCuti.push(`${sd(d + 1)} (${kode})`)
      }
      const lemburArr = lemburPerOrang.get(String(b.nrp)) || []
      const lemburTeks = lemburArr
        .map((l) => `${tglRingkas(l.tanggal)} — ${l.jenis.replace(/_/g, ' ')}`)
        .join('; ')
      const cutiArr = cutiPerOrang.get(String(b.nrp)) || []
      const cutiTeks = cutiArr
        .map((l) => `${tglRingkas(l.tanggal)} — ${l.jenis.replace(/_/g, ' ')}`)
        .join('; ')
      const komp = kompMap.get(String(b.nrp))

      const row = ws4.getRow(r4)
      row.values = [
        idx + 1,
        b.nrp,
        b.nama,
        b.jabatan,
        b.site,
        c.HDR,
        tglHadir.join(', '),
        lemburArr.length,
        lemburTeks,
        c.CT + c.CR,
        cutiTeks || tglCuti.join(', '),
        komp?.hari || 0,
        komp?.keterangan || '',
      ]
      row.eachCell((sel) => {
        sel.border = tipis
        sel.font = { size: 9 }
        sel.alignment = { vertical: 'top', wrapText: true, horizontal: 'left' }
      })
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' }
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'top' }
      row.getCell(3).font = { size: 9, bold: true }
      ;[6, 8, 10, 12].forEach((k) => {
        row.getCell(k).alignment = { horizontal: 'center', vertical: 'top' }
        row.getCell(k).font = { size: 10, bold: true }
      })
      // warna
      row.getCell(8).font = { size: 10, bold: true, color: { argb: lemburArr.length ? 'FFB45309' : 'FF94A3B8' } }
      row.getCell(10).font = { size: 10, bold: true, color: { argb: (c.CT + c.CR) ? 'FF9A3412' : 'FF94A3B8' } }
      const selKomp = row.getCell(12)
      selKomp.font = { size: 10, bold: true, color: { argb: (komp?.hari || 0) ? 'FF0F766E' : 'FF94A3B8' } }
      if ((komp?.hari || 0) > 0) {
        selKomp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } }
      }
      if (idx % 2 === 1) {
        ;[1, 2, 3, 4, 5, 7, 9, 11, 13].forEach((k) => {
          row.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        })
      }
      r4++
    })

    // baris total sheet 4
    const tot4 = ws4.getRow(r4)
    tot4.values = [
      '', '', `TOTAL ${barisMatriks.length} KARYAWAN`, '', '',
      barisMatriks.reduce((a, b) => a + (hitung[b.nrp]?.HDR || 0), 0),
      '',
      Object.values(lemburKali).reduce((a, b) => a + b, 0),
      '',
      barisMatriks.reduce((a, b) => a + (hitung[b.nrp]?.CT || 0) + (hitung[b.nrp]?.CR || 0), 0),
      '',
      barisMatriks.reduce((a, b) => a + (hitung[b.nrp]?.KMPC || 0), 0),
      '',
    ]
    tot4.eachCell((sel) => {
      sel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY2 } }
      sel.alignment = { horizontal: 'center', vertical: 'middle' }
      sel.border = tipis
    })

    ;[5, 12, 26, 20, 10, 13, 26, 12, 42, 11, 40, 16, 30].forEach((w, i) => (ws4.getColumn(i + 1).width = w))
    ws4.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: jmlKol4 } }

    // ══════════ keluaran ══════════
    const buffer = await wb.xlsx.writeBuffer()
    const bytes = new Uint8Array(buffer as ArrayBuffer)
    const namaFile = `Rekap_Matrix_${tahun}-${String(bulan).padStart(2, '0')}${siteFilter && siteFilter !== 'ALL' ? '_' + siteFilter : ''}.xlsx`

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${namaFile}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal membuat file Excel' }, { status: 500 })
  }
}
