// app/api/export-absensi-matrix/route.ts
// Export rekap absensi bulanan format matrix (grid) ke Excel
// 1 baris = 1 karyawan, kolom = tanggal 1-31

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function canExport(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    ['hr_ho', 'hr_site', 'hrga', 'hrga_pusat', 'hrga_site', 'admin', 'admin_site', 'pjo_site'].includes(r)
  )
}

// Mapping kode absensi ke label + warna
const KODE_INFO: any = {
  DS:  { label: 'Day Shift',      fill: 'FFE0F2FE' }, // biru muda
  NS:  { label: 'Night Shift',    fill: 'FFDDD6FE' }, // ungu muda
  OFF: { label: 'Off/Libur',      fill: 'FFE5E7EB' }, // abu
  CR:  { label: 'Cuti Roster',    fill: 'FFFEF3C7' }, // kuning
  CT:  { label: 'Cuti Tahunan',   fill: 'FFFED7AA' }, // orange
  SCK: { label: 'Shift Cuti Kompensasi', fill: 'FFA7F3D0' }, // hijau muda
  MCK: { label: 'Malam Cuti Kompensasi', fill: 'FF86EFAC' }, // hijau
  TR:  { label: 'Training',       fill: 'FFBFDBFE' }, // biru
  ID:  { label: 'Induksi',        fill: 'FFC7D2FE' }, // indigo
  S:   { label: 'Sakit',          fill: 'FFFECACA' }, // pink
  I:   { label: 'Izin Potongan',  fill: 'FFFEE2E2' }, // pink muda
  IR:  { label: 'Izin Resmi',     fill: 'FFFBCFE8' }, // rose
  A:   { label: 'Alfa',           fill: 'FFFCA5A5' }, // merah
  '':  { label: '-',              fill: 'FFFFFFFF' }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canExport(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periode = searchParams.get('periode') || 
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const siteFilter = searchParams.get('site') || ''

    const [tahunP, bulanP] = periode.split('-')
    const firstDay = `${tahunP}-${bulanP}-01`
    const lastDayNum = new Date(Number(tahunP), Number(bulanP), 0).getDate()
    const lastDay = `${tahunP}-${bulanP}-${String(lastDayNum).padStart(2, '0')}`

    // ══════════════════════════════════
    // 1. Ambil semua roster di periode
    // ══════════════════════════════════
    const { data: rosterRaw, error: rosterErr } = await supabase
      .from('rosters')
      .select('nrp, tanggal, shift_code')
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay)

    if (rosterErr) return NextResponse.json({ error: rosterErr.message }, { status: 500 })
    if (!rosterRaw || rosterRaw.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data roster untuk periode ini' }, { status: 404 })
    }

    // ══════════════════════════════════
    // 2. Kumpulkan NRP unique + enrich karyawan
    // ══════════════════════════════════
    const nrpList = Array.from(new Set(rosterRaw.map((r: any) => r.nrp)))
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .in('nrp', nrpList)

    const empMap = new Map<string, any>()
    ;(employees || []).forEach((e: any) => empMap.set(e.nrp, e))

    // Filter NRP yang ada data karyawannya
    let validNrps = nrpList.filter(nrp => empMap.has(nrp))

    // Filter by site
    if (siteFilter) {
      validNrps = validNrps.filter(nrp => empMap.get(nrp).site === siteFilter)
    }

    if (validNrps.length === 0) {
      return NextResponse.json({ error: 'Tidak ada karyawan valid untuk filter ini' }, { status: 404 })
    }

    // ══════════════════════════════════
    // 3. Ambil attendance
    // ══════════════════════════════════
    const { data: attendance } = await supabase
      .from('attendance')
      .select('nrp, tanggal, shift, clock_in')
      .in('nrp', validNrps)
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay)

    // ══════════════════════════════════
    // 4. Ambil leave_requests APPROVED
    // ══════════════════════════════════
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('nrp, tanggal_mulai, tanggal_selesai, jenis_cuti, status_final')
      .in('nrp', validNrps)
      .eq('status_final', 'DISETUJUI')
      .lte('tanggal_mulai', lastDay)
      .gte('tanggal_selesai', firstDay)

    // ══════════════════════════════════
    // 5. Ambil attendance_evidences APPROVED
    // ══════════════════════════════════
    const { data: evidences } = await supabase
      .from('attendance_evidences')
      .select('nrp, tanggal, kategori, status_atasan')
      .in('nrp', validNrps)
      .eq('status_atasan', 'APPROVED')
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay)

    // ══════════════════════════════════
    // 6. Build lookup maps (key: "nrp|YYYY-MM-DD")
    // ══════════════════════════════════
    const rosterMap = new Map<string, string>()
    rosterRaw.forEach((r: any) => {
      rosterMap.set(`${r.nrp}|${r.tanggal}`, (r.shift_code || '').toUpperCase())
    })

    const attMap = new Map<string, any>()
    ;(attendance || []).forEach((a: any) => {
      attMap.set(`${a.nrp}|${a.tanggal}`, a)
    })

    const leaveMap = new Map<string, string>() // "nrp|tgl" → jenis_cuti
    ;(leaves || []).forEach((lr: any) => {
      const start = new Date(`${lr.tanggal_mulai}T00:00:00`)
      const end = new Date(`${lr.tanggal_selesai}T00:00:00`)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${lr.nrp}|${d.toISOString().split('T')[0]}`
        leaveMap.set(key, lr.jenis_cuti)
      }
    })

    const evidenceMap = new Map<string, string>()
    ;(evidences || []).forEach((ev: any) => {
      evidenceMap.set(`${ev.nrp}|${ev.tanggal}`, ev.kategori)
    })

    // ══════════════════════════════════
    // 7. Fungsi tentukan kode per tanggal
    // ══════════════════════════════════
    function getKode(nrp: string, tanggal: string): string {
      const key = `${nrp}|${tanggal}`
      const rosterCode = (rosterMap.get(key) || '').toUpperCase()
      const att = attMap.get(key)
      const leave = leaveMap.get(key)
      const evidence = evidenceMap.get(key)

      // 1. Prioritas: LEAVE APPROVED
      if (leave) {
        const lj = leave.toUpperCase()
        if (lj.includes('TAHUN')) return 'CT'
        if (lj.includes('KOMPENSASI')) {
          // Cek attendance di tanggal ini
          if (att?.clock_in) {
            const shift = String(att.shift || '').toUpperCase()
            if (shift.includes('SIANG')) return 'SCK'
            if (shift.includes('MALAM')) return 'MCK'
          }
          return 'CR'
        }
        if (lj.includes('ROSTER') || lj.includes('REGULER')) return 'CR'
        // Cuti Lainnya = izin
        return 'I'
      }

      // 2. Cek evidence (sakit/izin)
      if (evidence) {
        const ek = evidence.toUpperCase()
        if (ek.includes('SAKIT')) return 'S'
        if (ek.includes('BERBAYAR')) return 'IR'
        if (ek.includes('IZIN')) return 'I'
      }

      // 3. Cek roster + attendance
      if (rosterCode === 'OFF') return 'OFF'
      if (rosterCode === 'ID') return 'ID'
      if (rosterCode === 'TR') return 'TR'
      if (rosterCode === 'CR') {
        // CR tanpa leave = kemungkinan belum ajukan
        if (att?.clock_in) {
          const shift = String(att.shift || '').toUpperCase()
          if (shift.includes('SIANG')) return 'SCK'
          if (shift.includes('MALAM')) return 'MCK'
        }
        return 'CR'
      }

      // Shift kerja (S = Siang, M = Malam, DS, NS)
      if (['S', 'DS', 'SIANG'].includes(rosterCode)) {
        return att?.clock_in ? 'DS' : 'A'
      }
      if (['M', 'NS', 'MALAM'].includes(rosterCode)) {
        return att?.clock_in ? 'NS' : 'A'
      }

      // Fallback
      return rosterCode || ''
    }

    // ══════════════════════════════════
    // 8. Build matrix data
    // ══════════════════════════════════
    validNrps.sort((a, b) => {
      const na = empMap.get(a).nama || ''
      const nb = empMap.get(b).nama || ''
      return na.localeCompare(nb)
    })

    // Header row
    const dayHeaders: string[] = []
    for (let d = 1; d <= lastDayNum; d++) {
      dayHeaders.push(String(d))
    }

    const header = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE', ...dayHeaders,
                    'HDR', 'CT', 'CR', 'KMP', 'S', 'I', 'IR', 'A', 'OFF', '%']

    const excelRows: any[][] = [header]

    validNrps.forEach((nrp, idx) => {
      const emp = empMap.get(nrp)
      const row: any[] = [idx + 1, nrp, emp.nama, emp.jabatan || '-', emp.site || '-']

      const counter: any = { HDR: 0, CT: 0, CR: 0, KMP: 0, S: 0, I: 0, IR: 0, A: 0, OFF: 0, TOTAL_KERJA: 0 }

      for (let d = 1; d <= lastDayNum; d++) {
        const dateStr = `${tahunP}-${bulanP}-${String(d).padStart(2, '0')}`
        const kode = getKode(nrp, dateStr)
        row.push(kode)

        // Hitung stats
        if (kode === 'DS' || kode === 'NS') { counter.HDR++; counter.TOTAL_KERJA++ }
        else if (kode === 'CT') { counter.CT++; counter.TOTAL_KERJA++ }
        else if (kode === 'CR') { counter.CR++ }
        else if (kode === 'SCK' || kode === 'MCK') { counter.KMP++; counter.HDR++; counter.TOTAL_KERJA++ }
        else if (kode === 'S') { counter.S++; counter.TOTAL_KERJA++ }
        else if (kode === 'I') { counter.I++; counter.TOTAL_KERJA++ }
        else if (kode === 'IR') { counter.IR++; counter.TOTAL_KERJA++ }
        else if (kode === 'A') { counter.A++; counter.TOTAL_KERJA++ }
        else if (kode === 'OFF') { counter.OFF++ }
      }

      const persen = counter.TOTAL_KERJA > 0
        ? Math.round((counter.HDR / counter.TOTAL_KERJA) * 1000) / 10
        : 0

      row.push(counter.HDR, counter.CT, counter.CR, counter.KMP, counter.S, counter.I, counter.IR, counter.A, counter.OFF, persen)
      excelRows.push(row)
    })

    // ══════════════════════════════════
    // 9. Build workbook
    // ══════════════════════════════════
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelRows)

    // Set column width
    const cols: any[] = [
      { wch: 4 },   // NO
      { wch: 10 },  // NRP
      { wch: 25 },  // NAMA
      { wch: 20 },  // JABATAN
      { wch: 12 },  // SITE
    ]
    for (let i = 0; i < lastDayNum; i++) cols.push({ wch: 5 })
    // Stat columns
    for (let i = 0; i < 10; i++) cols.push({ wch: 6 })
    ws['!cols'] = cols

    // Freeze header + kolom nama
    ws['!freeze'] = { xSplit: 5, ySplit: 1 }

    // Apply cell fill color berdasarkan kode
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let R = 1; R <= range.e.r; R++) {
      for (let C = 5; C < 5 + lastDayNum; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = ws[addr]
        if (!cell) continue
        const kode = String(cell.v || '')
        const info = KODE_INFO[kode] || KODE_INFO['']
        cell.s = {
          fill: { fgColor: { rgb: info.fill.replace('FF', '') } },
          alignment: { horizontal: 'center', vertical: 'center' },
          font: { bold: true, sz: 9 },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi')

    // ══════════════════════════════════
    // 10. Sheet Legenda
    // ══════════════════════════════════
    const legendData: any[][] = [
      ['LEGENDA KODE ABSENSI', ''],
      ['', ''],
      ['Kode', 'Keterangan'],
      ...Object.entries(KODE_INFO)
        .filter(([k]) => k !== '')
        .map(([k, v]: any) => [k, v.label])
    ]
    const wsLegend = XLSX.utils.aoa_to_sheet(legendData)
    wsLegend['!cols'] = [{ wch: 8 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsLegend, 'Legenda')

    // ══════════════════════════════════
    // 11. Return file
    // ══════════════════════════════════
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fileName = `Rekap_Absensi_${siteFilter || 'AllSite'}_${periode}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}