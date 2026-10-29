// app/api/export-absensi-matrix/route.ts
// EXPORT REKAP ABSENSI — MATRIX (Excel berwarna)
//
// Versi ini menyamakan logika penentuan kode dengan tampilan Matriks di aplikasi:
//   [MANUAL:xx] → cuti/izin approved → eviden → status attendance → TS Opt → roster
// Sebelumnya kode hanya diambil dari clock_in, sehingga semua yang absen lewat
// TS Opt / koreksi manual tampil sebagai A.
//
// Penulisan file memakai ExcelJS supaya warna sel benar-benar muncul di Excel.

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

// ── warna & label per kode (disamakan dengan CELL_STYLE di aplikasi) ──
const KODE: Record<string, { label: string; bg: string; fg: string }> = {
  DS:  { label: 'Day Shift',            bg: 'FFE0F2FE', fg: 'FF075985' },
  NS:  { label: 'Night Shift',          bg: 'FFEDE9FE', fg: 'FF5B21B6' },
  OFF: { label: 'Off/Libur',            bg: 'FFF1F5F9', fg: 'FF475569' },
  CR:  { label: 'Cuti Roster',          bg: 'FFFEF9C3', fg: 'FF854D0E' },
  CT:  { label: 'Cuti Tahunan',         bg: 'FFFED7AA', fg: 'FF7C2D12' },
  SCK: { label: 'Shift Cuti Kompensasi', bg: 'FFA7F3D0', fg: 'FF065F46' },
  MCK: { label: 'Malam Cuti Kompensasi', bg: 'FF6EE7B7', fg: 'FF064E3B' },
  TR:  { label: 'Training',             bg: 'FFBFDBFE', fg: 'FF1E3A8A' },
  ID:  { label: 'Induksi',              bg: 'FFC7D2FE', fg: 'FF312E81' },
  S:   { label: 'Sakit',                bg: 'FFFBCFE8', fg: 'FF831843' },
  I:   { label: 'Izin Potongan',        bg: 'FFFCE7F3', fg: 'FF9D174D' },
  IR:  { label: 'Izin Resmi',           bg: 'FFFFE4E6', fg: 'FF9F1239' },
  A:   { label: 'Alfa',                 bg: 'FFF87171', fg: 'FFFFFFFF' },
  DW:  { label: 'Day tanpa TS Opt',     bg: 'FFF0F9FF', fg: 'FF075985' },
  NW:  { label: 'Night tanpa TS Opt',   bg: 'FFF5F3FF', fg: 'FF5B21B6' },
}

const NAVY = 'FF003D79'
const NAVY2 = 'FF0B2A5B'

const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

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
    const jmlHariBulan = new Date(tahun, bulan, 0).getDate()
    const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // ── jumlah kolom tanggal ──
    // bulan berjalan → sampai hari ini; bulan lain → sampai akhir bulan
    const apakahBulanIni = tahun === now.getFullYear() && bulan === now.getMonth() + 1
    const jmlHari = apakahBulanIni ? now.getDate() : jmlHariBulan

    const awal = tglStr(tahun, bulan, 1)
    const akhirData = tglStr(tahun, bulan, jmlHariBulan)

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

    // ══════════════ 3. ATTENDANCE ══════════════
    let attAll: any[] = []
    for (let i = 0; i < validNrps.length; i += 200) {
      const { data } = await supabaseAdmin
        .from('attendance')
        .select('nrp, tanggal, shift, clock_in, clock_out, status, keterangan, jam_kerja_menit, clock_in_lokasi, clock_out_lokasi')
        .in('nrp', validNrps.slice(i, i + 200))
        .gte('tanggal', awal).lte('tanggal', akhirData)
      attAll = attAll.concat(data || [])
    }

    // ══════════════ 4. TS OPT (sumber utama "ada unit / kerja") ══════════════
    const tsKode = new Map<string, { kode: 'DS' | 'NS'; unit: string | null; hm: number | null }>()
    try {
      let tsAll: any[] = []
      for (let i = 0; i < validNrps.length; i += 200) {
        const potong = validNrps.slice(i, i + 200)
        const { data } = await supabaseAdmin
          .from('ts_opt')
          .select('tanggal, nrp, nama_operator, shift, kode_unit, hm_total')
          .gte('tanggal', awal).lte('tanggal', akhirData)
          .or(potong.map((n) => `nrp.eq.${n}`).join(','))
        if (data?.length) tsAll = tsAll.concat(data)
      }
      // kalau filter OR terlalu panjang / kosong, ambil sekaligus
      if (!tsAll.length) {
        const { data } = await supabaseAdmin
          .from('ts_opt')
          .select('tanggal, nrp, nama_operator, shift, kode_unit, hm_total')
          .gte('tanggal', awal).lte('tanggal', akhirData)
        tsAll = data || []
      }
      const normNama = (s: any) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      for (const r of tsAll) {
        const tgl = String(r.tanggal || '').slice(0, 10)
        if (!tgl) continue
        const sh = String(r.shift ?? '').toUpperCase()
        const kode: 'DS' | 'NS' =
          sh === '2' || sh.includes('MALAM') || sh === 'NS' || sh.includes('NIGHT') ? 'NS' : 'DS'
        const isi = { kode, unit: r.kode_unit || null, hm: r.hm_total ?? null }
        const nr = String(r.nrp || '').trim()
        if (nr) {
          tsKode.set(`${tgl}|NRP:${nr}`, isi)
          tsKode.set(`${tgl}|NRP:${nr.replace(/^B/i, '')}`, isi)
        }
        const nm = normNama(r.nama_operator)
        if (nm) tsKode.set(`${tgl}|NM:${nm}`, isi)
      }
    } catch { /* tabel ts_opt mungkin belum ada */ }

    // helper: query berkala 200 NRP (hindari batas URL Supabase)
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

    // ══════════════ 5. CUTI / IZIN / EVIDEN ══════════════
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

    // ══════════════ 6. LEMBUR ══════════════
    let lemburRows: any[] = []
    try {
      lemburRows = await ambilBerkala('overtime_requests',
        'nrp, tanggal, jam_mulai, jam_selesai, total_jam, status_final, status_atasan, status_pjo')
    } catch { /* tabel lembur belum ada */ }

    const lemburJam: Record<string, number> = {}
    const lemburKali: Record<string, number> = {}
    const lemburPerHari = new Map<string, number>()
    for (const l of lemburRows || []) {
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

    // ══════════════ 7. MAP PENCARIAN ══════════════
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

    // ══════════════ 8. TENTUKAN KODE (sama dengan aplikasi) ══════════════
    const normNama = (s: any) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

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

      // ① koreksi manual dari HR → selalu menang
      const manual = String(att?.keterangan || '').match(/\[MANUAL:([A-Za-z]+)\]/i)
      if (manual) return manual[1].toUpperCase()

      // ② cuti / izin disetujui
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

      // ③ eviden (sakit / izin)
      if (ev) {
        if (ev.includes('SAKIT')) return 'S'
        if (ev.includes('BERBAYAR')) return 'IR'
        if (ev.includes('IZIN')) return 'I'
      }

      // ④ status attendance yang disimpan
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

      // ⑤ ada di TS Opt = benar-benar bekerja
      if (ts) return att?.clock_in ? ts.kode : (ts.kode === 'NS' ? 'NW' : 'DW')

      // ⑥ roster yang bukan shift kerja
      if (roster === 'OFF') return 'OFF'
      if (roster === 'ID') return 'ID'
      if (roster === 'TR') return 'TR'
      if (roster === 'CR') return 'CR'
      if (roster === 'CT') return 'CT'
      if (roster === 'LV') return 'CT'

      // ⑦ roster shift kerja tapi tidak ada bukti apa pun
      if (roster === 'S' || roster === 'M') return 'A'

      return ''
    }

    // ══════════════ 9. SUSUN BARIS ══════════════
    validNrps.sort((a, b) => String(empMap.get(a).nama || '').localeCompare(String(empMap.get(b).nama || '')))

    const kolomRingkas = ['HDR', 'DS', 'NS', 'CT', 'CR', 'KMP', 'S', 'I', 'IR', 'A', 'OFF', '%']
    const kolomLembur = ['LEMBUR (kali)', 'JAM LEMBUR']

    type BarisMatriks = { nrp: string; nama: string; kode: string[] }
    const barisMatriks: BarisMatriks[] = []
    const hitung: Record<string, Record<string, number>> = {}

    for (const nrp of validNrps) {
      const emp = empMap.get(nrp)
      const kodes: string[] = []
      const c: Record<string, number> = { HDR: 0, DS: 0, NS: 0, CT: 0, CR: 0, KMP: 0, S: 0, I: 0, IR: 0, A: 0, OFF: 0, TOTAL_KERJA: 0 }
      for (let d = 1; d <= jmlHari; d++) {
        const kode = tentukanKode(nrp, emp.nama || '', tglStr(tahun, bulan, d))
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
      hitung[nrp] = c
      barisMatriks.push({ nrp, nama: emp.nama || '', kode: kodes })
    }

    // ══════════════ 10. TULIS EXCEL (ExcelJS → warna nyata) ══════════════
    const wb = new ExcelJS.Workbook()
    wb.creator = 'BTM Mobile — Portal Internal'
    wb.created = new Date()

    // ---------- Sheet 1: Rekap Matrix ----------
    const ws = wb.addWorksheet('Rekap Absensi', { views: [{ state: 'frozen', xSplit: 5, ySplit: 4 }] })

    const judul = `REKAP ABSENSI — ${new Date(tahun, bulan - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()}`
    const subInfo = [
      `Site: ${siteFilter && siteFilter !== 'ALL' ? siteFilter : 'Semua Site'}`,
      `Periode data: 01 – ${String(jmlHari).padStart(2, '0')} ${new Date(tahun, bulan - 1, 1).toLocaleDateString('id-ID', { month: 'long' })} ${tahun}` +
        (apakahBulanIni ? ' (s.d. hari ini)' : ''),
      `Dicetak: ${new Date().toLocaleString('id-ID')}`,
    ].join('   •   ')

    ws.mergeCells(1, 1, 1, 12)
    const cJudul = ws.getCell(1, 1)
    cJudul.value = judul
    cJudul.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    cJudul.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cJudul.alignment = { vertical: 'middle' }
    ws.getRow(1).height = 24

    ws.mergeCells(2, 1, 2, 12)
    const cSub = ws.getCell(2, 1)
    cSub.value = subInfo
    cSub.font = { size: 9, color: { argb: 'FF475569' } }
    cSub.alignment = { vertical: 'middle' }
    ws.getRow(2).height = 16

    // baris 3 = nama hari (Sen/Sel/...), baris 4 = tanggal 1..31
    const barisHari = 3
    const barisTgl = 4
    const kolomAwalTgl = 6   // A..E = NO, NRP, NAMA, JABATAN, SITE

    const headerAtas = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE']
    headerAtas.forEach((h, i) => {
      const sel = ws.getCell(barisTgl, i + 1)
      sel.value = h
      ws.mergeCells(barisHari, i + 1, barisTgl, i + 1)
    })

    for (let d = 1; d <= jmlHari; d++) {
      const tgl = new Date(tahun, bulan - 1, d)
      const kol = kolomAwalTgl + d - 1
      const selHari = ws.getCell(barisHari, kol)
      const selTgl = ws.getCell(barisTgl, kol)
      selHari.value = hariNama[tgl.getDay()].slice(0, 3)
      selTgl.value = d
      const akhirPekan = tgl.getDay() === 0 || tgl.getDay() === 6
      ;[selHari, selTgl].forEach((s) => {
        s.font = { bold: true, size: 8, color: { argb: akhirPekan ? 'FFB91C1C' : 'FFFFFFFF' } }
        s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: akhirPekan ? 'FFFEE2E2' : NAVY2 } }
        s.alignment = { horizontal: 'center', vertical: 'middle' }
        s.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
      })
    }

    // header kolom ringkas
    const kolomRingkasAwal = kolomAwalTgl + jmlHari
    ;[...kolomRingkas, ...kolomLembur].forEach((h, i) => {
      const sel = ws.getCell(barisTgl, kolomRingkasAwal + i)
      sel.value = h
      ws.mergeCells(barisHari, kolomRingkasAwal + i, barisTgl, kolomRingkasAwal + i)
      sel.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: h.startsWith('LEMBUR') || h === 'JAM LEMBUR' ? 'FFB45309' : NAVY } }
      sel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      sel.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
    })

    for (let i = 0; i < headerAtas.length; i++) {
      const sel = ws.getCell(barisTgl, i + 1)
      sel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
      sel.alignment = { horizontal: i >= 2 ? 'left' : 'center', vertical: 'middle' }
      sel.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
    }
    ws.getRow(barisHari).height = 14
    ws.getRow(barisTgl).height = 22

    const tipis = {
      top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    }

    let r = barisTgl + 1
    barisMatriks.forEach((b, idx) => {
      const emp = empMap.get(b.nrp)
      const c = hitung[b.nrp]
      const row = ws.getRow(r)

      row.getCell(1).value = idx + 1
      row.getCell(2).value = b.nrp
      row.getCell(3).value = b.nama
      row.getCell(4).value = emp?.jabatan || '-'
      row.getCell(5).value = emp?.site || '-'

      for (let i = 1; i <= 5; i++) {
        const sel = row.getCell(i)
        sel.font = { size: 9, bold: i === 3 }
        sel.alignment = { horizontal: i === 1 ? 'center' : 'left', vertical: 'middle' }
        sel.border = tipis
      }

      for (let d = 0; d < jmlHari; d++) {
        const kode = b.kode[d] || ''
        const sel = row.getCell(kolomAwalTgl + d)
        sel.value = kode || null
        const info = KODE[kode]
        sel.alignment = { horizontal: 'center', vertical: 'middle' }
        sel.border = tipis
        sel.font = { size: 9, bold: true, color: { argb: info?.fg || 'FF0F172A' } }
        if (info) sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: info.bg } }
        else {
          const tgl = new Date(tahun, bulan - 1, d + 1)
          if (tgl.getDay() === 0 || tgl.getDay() === 6) {
            sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
          }
        }
      }

      const persen = c.TOTAL_KERJA > 0 ? Math.round((c.HDR / c.TOTAL_KERJA) * 1000) / 10 : 0
      const nilaiRingkas = [c.HDR, c.DS, c.NS, c.CT, c.CR, c.KMP, c.S, c.I, c.IR, c.A, c.OFF, persen,
                            lemburKali[b.nrp] || 0, lemburJam[b.nrp] || 0]
      nilaiRingkas.forEach((v, i) => {
        const sel = row.getCell(kolomRingkasAwal + i)
        sel.value = v
        sel.alignment = { horizontal: 'center', vertical: 'middle' }
        sel.border = tipis
        sel.font = { size: 9, bold: true }
        const namaKol = [...kolomRingkas, ...kolomLembur][i]
        if (namaKol === '%') {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: persen >= 90 ? 'FFD1FAE5' : persen >= 70 ? 'FFFEF3C7' : 'FFFEE2E2' } }
        } else if (namaKol === 'A' && c.A > 0) {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
          sel.font = { size: 9, bold: true, color: { argb: 'FF991B1B' } }
        } else if (namaKol === 'LEMBUR (kali)' || namaKol === 'JAM LEMBUR') {
          if (Number(v) > 0) sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
        } else {
          sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        }
      })

      if (idx % 2 === 1) {
        for (let i = 1; i <= 5; i++) {
          row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFDFE' } }
        }
      }

      r++
    })

    // baris total
    ws.getRow(r).height = 18
    ws.mergeCells(r, 1, r, 5)
    const cTotal = ws.getCell(r, 1)
    cTotal.value = `TOTAL ${barisMatriks.length} KARYAWAN`
    cTotal.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY2 } }
    cTotal.alignment = { horizontal: 'center', vertical: 'middle' }

    for (let d = 0; d < jmlHari; d++) {
      const sel = ws.getCell(r, kolomAwalTgl + d)
      const jml = barisMatriks.filter((b) => (b.kode[d] || '') === 'A').length
      sel.value = jml > 0 ? jml : null
      sel.font = { size: 8, bold: true, color: { argb: 'FF991B1B' } }
      sel.alignment = { horizontal: 'center' }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }
      sel.border = tipis
    }
    const totalRingkas = ['HDR', 'DS', 'NS', 'CT', 'CR', 'KMP', 'S', 'I', 'IR', 'A', 'OFF'].map((k) =>
      barisMatriks.reduce((a, b) => a + (hitung[b.nrp] as any)[k], 0))
    totalRingkas.forEach((v, i) => {
      const sel = ws.getCell(r, kolomRingkasAwal + i)
      sel.value = v
      sel.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY2 } }
      sel.alignment = { horizontal: 'center' }
      sel.border = tipis
    })
    const jamTotal = Object.values(lemburJam).reduce((a, b) => a + b, 0)
    const selKali = ws.getCell(r, kolomRingkasAwal + kolomRingkas.length)
    selKali.value = Object.values(lemburKali).reduce((a, b) => a + b, 0)
    const selJam = ws.getCell(r, kolomRingkasAwal + kolomRingkas.length + 1)
    selJam.value = Math.round(jamTotal * 100) / 100
    ;[selKali, selJam].forEach((s) => {
      s.font = { size: 9, bold: true, color: { argb: 'FFFFFFFF' } }
      s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }
      s.alignment = { horizontal: 'center' }
      s.border = tipis
    })

    // lebar kolom
    ws.getColumn(1).width = 5
    ws.getColumn(2).width = 11
    ws.getColumn(3).width = 26
    ws.getColumn(4).width = 18
    ws.getColumn(5).width = 9
    for (let d = 0; d < jmlHari; d++) ws.getColumn(kolomAwalTgl + d).width = 4.2
    for (let i = 0; i < kolomRingkas.length; i++) ws.getColumn(kolomRingkasAwal + i).width = 5.5
    ws.getColumn(kolomRingkasAwal + kolomRingkas.length).width = 8
    ws.getColumn(kolomRingkasAwal + kolomRingkas.length + 1).width = 9

    ws.autoFilter = { from: { row: barisTgl, column: 1 }, to: { row: barisTgl, column: kolomRingkasAwal + kolomRingkas.length + 1 } }

    // ---------- Sheet 2: Legenda ----------
    const wl = wb.addWorksheet('Legenda')
    wl.getColumn(1).width = 8
    wl.getColumn(2).width = 30
    wl.getCell(1, 1).value = 'LEGENDA KODE ABSENSI'
    wl.getCell(1, 1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    wl.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    wl.mergeCells(1, 1, 1, 2)
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
      '• Koreksi manual HR (DS/NS/A/…) ditampilkan sesuai koreksi tersebut.',
      '• Sel kosong = tidak ada roster, absensi, maupun TS Opt pada hari itu.',
      '• Kolom tanggal pada bulan berjalan hanya sampai hari ini.',
    ]
    catatan.forEach((t) => {
      const sel = wl.getCell(rl, 1)
      sel.value = t
      sel.font = { size: 9, bold: t === 'Catatan:', color: { argb: 'FF475569' } }
      wl.mergeCells(rl, 1, rl, 2)
      rl++
    })

    // ---------- Sheet 3: Detail per hari ----------
    const wd = wb.addWorksheet('Detail Absensi', { views: [{ state: 'frozen', ySplit: 1 }] })
    const headerDetail = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE', 'TANGGAL', 'HARI', 'KODE', 'JAM MASUK', 'JAM KELUAR', 'STATUS', 'KETERANGAN', 'LEMBUR (jam)']
    wd.addRow(headerDetail)
    wd.getRow(1).eachCell((sel) => {
      sel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
      sel.alignment = { horizontal: 'center', vertical: 'middle' }
      sel.border = tipis
    })

    let noDetail = 1
    for (const b of barisMatriks) {
      const emp = empMap.get(b.nrp)
      for (let d = 0; d < jmlHari; d++) {
        const kode = b.kode[d] || ''
        if (!kode) continue
        const tanggal = tglStr(tahun, bulan, d + 1)
        const att = attMap.get(`${b.nrp}|${tanggal}`)
        const info = KODE[kode]
        const row = wd.addRow([
          noDetail++, b.nrp, b.nama, emp?.jabatan || '-', emp?.site || '-',
          tanggal, hariNama[new Date(tahun, bulan - 1, d + 1).getDay()], kode,
          att?.clock_in ? new Date(att.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
          att?.clock_out ? new Date(att.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
          att?.status || '', att?.keterangan || '',
          lemburPerHari.get(`${b.nrp}|${tanggal}`) || '',
        ])
        const selKode = row.getCell(8)
        selKode.font = { bold: true, size: 9, color: { argb: info?.fg || 'FF0F172A' } }
        if (info) selKode.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: info.bg } }
        row.eachCell((sel: any) => {
          sel.border = tipis
          if (sel !== selKode) sel.font = { size: 9 }
          sel.alignment = { vertical: 'middle' }
        })
      }
    }
    ;[5, 11, 26, 18, 9, 12, 9, 7, 10, 10, 12, 30, 12].forEach((w, i) => (wd.getColumn(i + 1).width = w))
    wd.autoFilter = { from: 'A1', to: 'M1' }

    // ---------- keluaran ----------
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
