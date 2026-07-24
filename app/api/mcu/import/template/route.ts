// app/api/mcu/import/template/route.ts v2.0
// Template MCU dengan smart dropdown (learn from history)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'
import ExcelJS from 'exceljs'

const ALLOWED_ROLES = ['super_admin', 'hr_ho', 'hr_site']
const NUM_TEMUAN_COLS = 5  // 5 kolom TEMUAN + 5 kolom KETERANGAN

// Default temuan (kalau history kosong, minimal ini yang muncul di dropdown)
const DEFAULT_FINDINGS = [
  'Mata', 'Gigi', 'Telinga', 'Kulit', 'Jantung', 'Paru-paru',
  'Hati', 'Ginjal', 'Tekanan Darah', 'Kolesterol', 'Gula Darah',
  'Asam Urat', 'Lainnya'
]

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  if (!isSuperAdmin && !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const site = searchParams.get('site') || ''
  const departemen = searchParams.get('departemen') || ''

  // ── STEP 1: Karyawan ──
  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, site, departemen, jabatan')
    .eq('status_karyawan', 'Aktif')
    .order('site', { ascending: true })
    .order('nama', { ascending: true })

  if (!isSuperAdmin && role === 'hr_site') {
    empQuery = empQuery.eq('site', session.site || '')
  }
  if (site) empQuery = empQuery.eq('site', site)
  if (departemen) empQuery = empQuery.eq('departemen', departemen)

  const { data: employees, error } = await empQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!employees?.length) return NextResponse.json({ error: 'Tidak ada karyawan sesuai filter' }, { status: 404 })

  const nrpList = employees.map(e => e.nrp)
  const today = getWitaToday()

  // ── STEP 2: MCU aktif per karyawan ──
  const { data: activeMcus } = await supabaseAdmin
    .from('mcu')
    .select('nrp, tanggal_mcu, tanggal_expired, hasil')
    .in('nrp', nrpList)
    .gte('tanggal_expired', today)
    .order('tanggal_mcu', { ascending: false })

  const mcuMap: Record<string, any> = {}
  ;(activeMcus || []).forEach((m: any) => { if (!mcuMap[m.nrp]) mcuMap[m.nrp] = m })

  // ── STEP 3: 🆕 Ambil HISTORY temuan (learn from DB) ──
  const { data: findingHistory } = await supabaseAdmin
    .from('mcu_findings')
    .select('jenis_temuan')

  const historySet = new Set<string>()
  ;(findingHistory || []).forEach((f: any) => {
    const v = String(f.jenis_temuan || '').trim()
    if (v) historySet.add(v)
  })

  // Merge history + default → unique + sorted
  DEFAULT_FINDINGS.forEach(d => historySet.add(d))
  const dropdownList = Array.from(historySet).sort()

  console.log(`[MCU Template] Dropdown list (${dropdownList.length} items):`, dropdownList)

  // ── STEP 4: Build Excel ──
  const wb = new ExcelJS.Workbook()
  wb.creator = 'BTM Portal'
  wb.created = new Date()

  const ws = wb.addWorksheet('Import MCU', {
    views: [{ state: 'frozen', xSplit: 5, ySplit: 3 }]
  })

  // Total kolom: 12 fix + (5 temuan × 2) + 1 keterangan = 23
  const totalCols = 12 + (NUM_TEMUAN_COLS * 2) + 1

  // ── Header Row 1: Title ──
  ws.mergeCells(1, 1, 1, totalCols)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `📋 TEMPLATE IMPORT MCU — PT. BOSTON TRIKORAMA HARDIKA`
  titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D79' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 30

  // ── Header Row 2: Info ──
  ws.mergeCells(2, 1, 2, totalCols)
  const infoCell = ws.getCell(2, 1)
  infoCell.value = `Generated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA | Total: ${employees.length} karyawan | 💡 Kolom TEMUAN pakai DROPDOWN (klik cell → panah)`
  infoCell.font = { size: 10, italic: true, color: { argb: 'FF666666' } }
  infoCell.alignment = { horizontal: 'center' }
  ws.getRow(2).height = 20

  // ── Header Row 3 ──
  const headers: any[] = [
    { key: 'nrp', label: 'NRP', width: 12, color: 'FF003D79' },
    { key: 'nama', label: 'NAMA', width: 30, color: 'FF003D79' },
    { key: 'site', label: 'SITE', width: 12, color: 'FF003D79' },
    { key: 'departemen', label: 'DEPT', width: 14, color: 'FF003D79' },
    { key: 'mcu_aktif', label: 'MCU AKTIF S/D', width: 14, color: 'FF10B981' },
    { key: 'tanggal_mcu', label: 'TGL MCU *', width: 14, color: 'FFF59E0B' },
    { key: 'jenis_mcu', label: 'JENIS MCU *', width: 14, color: 'FFF59E0B' },
    { key: 'hasil', label: 'HASIL *', width: 18, color: 'FFF59E0B' },
    { key: 'dokter', label: 'DOKTER', width: 20, color: 'FFCCCCCC' },
    { key: 'rumah_sakit', label: 'RUMAH SAKIT', width: 22, color: 'FFCCCCCC' },
    { key: 'tanggal_berlaku', label: 'TGL BERLAKU', width: 14, color: 'FFCCCCCC' },
    { key: 'tanggal_expired', label: 'TGL EXPIRED *', width: 14, color: 'FFF59E0B' },
  ]

  // 🆕 5 kolom TEMUAN + 5 kolom KETERANGAN (pair)
  for (let i = 1; i <= NUM_TEMUAN_COLS; i++) {
    headers.push({ key: `temuan_${i}`, label: `TEMUAN ${i}`, width: 18, color: 'FF8B5CF6', isFindingList: true })
    headers.push({ key: `ket_${i}`, label: `KET ${i}`, width: 20, color: 'FFA78BFA' })
  }

  headers.push({ key: 'keterangan', label: 'KETERANGAN', width: 30, color: 'FFCCCCCC' })

  const headerRow = ws.getRow(3)
  headers.forEach((h, idx) => {
    const col = idx + 1
    const cell = headerRow.getCell(col)
    cell.value = h.label
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: h.color } }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    }
    ws.getColumn(col).width = h.width
  })
  headerRow.height = 35

  // ── Data Rows ──
  employees.forEach((emp: any, idx: number) => {
    const rowNum = idx + 4
    const row = ws.getRow(rowNum)
    const mcuAktif = mcuMap[emp.nrp]

    row.getCell(1).value = emp.nrp
    row.getCell(2).value = emp.nama
    row.getCell(3).value = emp.site || '-'
    row.getCell(4).value = emp.departemen || '-'
    row.getCell(5).value = mcuAktif?.tanggal_expired || '(belum ada MCU aktif)'

    // Style locked columns (biru pucat)
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
      cell.font = { size: 10, color: { argb: 'FF1E3A8A' } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      }
    }

    if (mcuAktif) {
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
      row.getCell(5).font = { size: 10, bold: true, color: { argb: 'FF16A34A' } }
    }

    // Editable columns border tipis
    for (let c = 6; c <= totalCols; c++) {
      const cell = row.getCell(c)
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        left: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        right: { style: 'hair', color: { argb: 'FFCCCCCC' } },
      }
    }
  })

  // ── 🆕 STEP 5: DROPDOWN Validation untuk kolom TEMUAN ──
  // Kolom TEMUAN ada di posisi: 13, 15, 17, 19, 21 (setiap 2 kolom)
  const totalRows = employees.length + 3
  const findingColumns: number[] = []
  for (let i = 0; i < NUM_TEMUAN_COLS; i++) {
    findingColumns.push(13 + (i * 2)) // 13, 15, 17, 19, 21
  }

  // Simpan list dropdown di sheet tersembunyi (biar bisa reference)
  const lookupSheet = wb.addWorksheet('_lookup', { state: 'hidden' })
  lookupSheet.getColumn(1).width = 30
  dropdownList.forEach((item, i) => {
    lookupSheet.getCell(i + 1, 1).value = item
  })

  // Named range untuk dropdown
  const rangeAddress = `_lookup!$A$1:$A$${dropdownList.length}`

  // Apply data validation ke setiap cell temuan
  findingColumns.forEach(colIdx => {
    for (let r = 4; r <= totalRows; r++) {
      const cell = ws.getCell(r, colIdx)
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`=${rangeAddress}`],
        showErrorMessage: false, // ⭐ Biar HR bisa input custom (kalau temuan baru)
        showInputMessage: true,
        promptTitle: '🔬 Pilih Temuan',
        prompt: 'Pilih dari dropdown ATAU ketik manual kalau temuan baru',
      }
    }
  })

  // ── Sheet 2: PANDUAN ──
  const ws2 = wb.addWorksheet('PANDUAN')
  ws2.getColumn(1).width = 100
  const guides = [
    '📘 PANDUAN PENGISIAN TEMPLATE IMPORT MCU v2.0',
    '',
    '⚠️ ATURAN UMUM:',
    '  1. JANGAN mengubah kolom NRP, NAMA, SITE, DEPT (biru)',
    '  2. JANGAN mengubah urutan kolom',
    '  3. Baris yang KOLOM TGL MCU-nya kosong = akan di-SKIP',
    '',
    '📅 FORMAT TANGGAL: YYYY-MM-DD (contoh: 2026-07-24)',
    '',
    '📋 JENIS MCU (pilih): PERIODIK, KHUSUS, AWAL, PRA-KERJA, BERKALA',
    '',
    '🏥 HASIL (pilih): FIT, FIT WITH NOTE, UNFIT, TEMPORARY UNFIT',
    '',
    '🔬 KOLOM TEMUAN (5 kolom ungu):',
    '  • Klik cell → panah dropdown muncul di kanan',
    '  • Pilih temuan dari list (contoh: "Mata", "Gigi")',
    '  • Kalau temuan BELUM ada di list → KETIK MANUAL',
    '  • Temuan baru akan otomatis muncul di dropdown next time',
    '  • Kolom KETERANGAN → isi detail (contoh: "Minus 1.5")',
    '  • Kalau karyawan TIDAK ada temuan → kosongkan semua',
    '',
    '💡 CONTOH PENGISIAN:',
    '  Karyawan A: temuan Mata + Gigi',
    '    TEMUAN 1 = "Mata"   KET 1 = "Minus 1.5"',
    '    TEMUAN 2 = "Gigi"   KET 2 = "Karies gigi 2"',
    '    TEMUAN 3-5 = KOSONG',
    '',
    '  Karyawan B: tidak ada temuan',
    '    TEMUAN 1-5 = KOSONG SEMUA',
    '',
    '💚 KOLOM HIJAU (MCU AKTIF S/D):',
    '  • Info readonly: MCU aktif karyawan kalau ada',
    '',
    '📤 UPLOAD PDF: MANUAL per karyawan di Monitoring MCU',
    '',
    '✅ SETELAH SELESAI:',
    '  1. Save file Excel',
    '  2. Upload di halaman Import MCU',
    '  3. Preview → cek error',
    '  4. Klik COMMIT untuk simpan',
  ]
  guides.forEach((line, idx) => {
    const cell = ws2.getCell(idx + 1, 1)
    cell.value = line
    if (line.startsWith('📘')) {
      cell.font = { bold: true, size: 14, color: { argb: 'FF003D79' } }
    } else if (line.match(/^[⚠️📅📋🏥🔬💡💚📤✅]/)) {
      cell.font = { bold: true, size: 11, color: { argb: 'FFF59E0B' } }
    }
  })

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `TEMPLATE_IMPORT_MCU_${site || 'ALL'}_${today}.xlsx`
    .replace(/[^a-zA-Z0-9_.-]/g, '_')

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}