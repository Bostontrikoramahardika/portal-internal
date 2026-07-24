// app/api/mcu/import/template/route.ts
// Generate Excel template MCU dengan data karyawan auto-fill
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'
import ExcelJS from 'exceljs'

const ALLOWED_ROLES = ['super_admin', 'hr_ho', 'hr_site']

// 13 Jenis temuan (sesuai mcu_finding_types)
const FINDING_TYPES = [
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

  // ── STEP 1: Ambil karyawan aktif ──
  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, site, departemen, jabatan')
    .eq('status_karyawan', 'Aktif')
    .order('site', { ascending: true })
    .order('nama', { ascending: true })

  // Scope role: hr_site hanya lihat site sendiri
  if (!isSuperAdmin && role === 'hr_site') {
    empQuery = empQuery.eq('site', session.site || '')
  }

  if (site) empQuery = empQuery.eq('site', site)
  if (departemen) empQuery = empQuery.eq('departemen', departemen)

  const { data: employees, error } = await empQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!employees || employees.length === 0) {
    return NextResponse.json({ error: 'Tidak ada karyawan sesuai filter' }, { status: 404 })
  }

  // ── STEP 2: Ambil MCU aktif per karyawan (untuk info kolom) ──
  const nrpList = employees.map(e => e.nrp)
  const today = getWitaToday()

  const { data: activeMcus } = await supabaseAdmin
    .from('mcu')
    .select('nrp, tanggal_mcu, tanggal_expired, hasil')
    .in('nrp', nrpList)
    .gte('tanggal_expired', today)
    .order('tanggal_mcu', { ascending: false })

  // Map: nrp → mcu aktif terbaru
  const mcuMap: Record<string, any> = {}
  ;(activeMcus || []).forEach((m: any) => {
    if (!mcuMap[m.nrp]) mcuMap[m.nrp] = m
  })

  // ── STEP 3: Bangun Excel ──
  const wb = new ExcelJS.Workbook()
  wb.creator = 'BTM Portal'
  wb.created = new Date()

  const ws = wb.addWorksheet('Import MCU', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 3 }]
  })

  // ── Header Row 1: Judul ──
  ws.mergeCells(1, 1, 1, 12 + FINDING_TYPES.length)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `📋 TEMPLATE IMPORT MCU — PT. BOSTON TRIKORAMA HARDIKA`
  titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D79' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 30

  // ── Header Row 2: Info ──
  ws.mergeCells(2, 1, 2, 12 + FINDING_TYPES.length)
  const infoCell = ws.getCell(2, 1)
  infoCell.value = `Generated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA | Total: ${employees.length} karyawan | ⚠️ Kolom kuning WAJIB diisi | Kolom NRP/NAMA JANGAN DIUBAH`
  infoCell.font = { size: 10, italic: true, color: { argb: 'FF666666' } }
  infoCell.alignment = { horizontal: 'center' }
  ws.getRow(2).height = 20

  // ── Header Row 3: Kolom ──
  const headerRow = ws.getRow(3)
  const headers = [
    { key: 'nrp', label: 'NRP', width: 12, locked: true },
    { key: 'nama', label: 'NAMA', width: 30, locked: true },
    { key: 'site', label: 'SITE', width: 12, locked: true },
    { key: 'departemen', label: 'DEPT', width: 14, locked: true },
    { key: 'mcu_aktif_sampai', label: 'MCU AKTIF S/D', width: 14, locked: true, info: true },
    { key: 'tanggal_mcu', label: 'TGL MCU *', width: 14, required: true },
    { key: 'jenis_mcu', label: 'JENIS MCU *', width: 14, required: true },
    { key: 'hasil', label: 'HASIL *', width: 18, required: true },
    { key: 'dokter', label: 'DOKTER', width: 20 },
    { key: 'rumah_sakit', label: 'RUMAH SAKIT', width: 22 },
    { key: 'tanggal_berlaku', label: 'TGL BERLAKU', width: 14 },
    { key: 'tanggal_expired', label: 'TGL EXPIRED *', width: 14, required: true },
    // 13 kolom temuan
    ...FINDING_TYPES.map(t => ({ key: `t_${t}`, label: t.toUpperCase(), width: 12, isFinding: true })),
    { key: 'keterangan', label: 'KETERANGAN', width: 30 },
  ]

  headers.forEach((h, idx) => {
    const col = idx + 1
    const cell = headerRow.getCell(col)
    cell.value = h.label
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

    // Warna header
    let bgColor = 'FF003D79' // biru default (locked)
    if ((h as any).required) bgColor = 'FFF59E0B' // amber (required)
    if ((h as any).info) bgColor = 'FF10B981' // hijau (info readonly)
    if ((h as any).isFinding) bgColor = 'FF8B5CF6' // ungu (temuan)

    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    }

    // Set width
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

    // Style kolom locked (biru pucat)
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

    // Kolom warning kalau MCU aktif
    if (mcuAktif) {
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
      row.getCell(5).font = { size: 10, bold: true, color: { argb: 'FF16A34A' } }
    }

    // Kolom kosong (editable) — border tipis
    for (let c = 6; c <= headers.length; c++) {
      const cell = row.getCell(c)
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        left: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        right: { style: 'hair', color: { argb: 'FFCCCCCC' } },
      }
    }
  })

  // ── Sheet 2: PANDUAN ──
  const ws2 = wb.addWorksheet('PANDUAN')
  ws2.getColumn(1).width = 100
  const guides = [
    '📘 PANDUAN PENGISIAN TEMPLATE IMPORT MCU',
    '',
    '⚠️ ATURAN UMUM:',
    '  1. JANGAN mengubah kolom NRP, NAMA, SITE, DEPT (biru)',
    '  2. JANGAN mengubah urutan kolom',
    '  3. JANGAN menghapus baris karyawan',
    '  4. Baris yang KOLOM TGL MCU-nya kosong = akan di-SKIP (tidak diproses)',
    '',
    '📅 FORMAT TANGGAL:',
    '  • Gunakan format: YYYY-MM-DD (contoh: 2026-07-24)',
    '  • ATAU format Excel Date',
    '',
    '📋 JENIS MCU (pilih salah satu):',
    '  • PERIODIK',
    '  • KHUSUS',
    '  • AWAL / PRA-KERJA',
    '  • BERKALA',
    '',
    '🏥 HASIL (pilih salah satu):',
    '  • FIT',
    '  • FIT WITH NOTE',
    '  • UNFIT',
    '  • TEMPORARY UNFIT',
    '',
    '🔬 KOLOM TEMUAN (13 kolom ungu):',
    '  • Isi "Y" atau "1" kalau ada temuan',
    '  • Kosongkan kalau TIDAK ada temuan',
    '  • Isi teks keterangan spesifik kalau ada detail (contoh: "Minus 1.5")',
    '',
    '💚 KOLOM HIJAU (MCU AKTIF S/D):',
    '  • Info readonly: menampilkan MCU aktif karyawan (kalau ada)',
    '  • Kalau ada tanggal → karyawan sudah punya MCU valid',
    '  • Kalau (belum ada MCU aktif) → wajib input MCU baru',
    '',
    '📤 UPLOAD FILE PDF/JPG:',
    '  • BULK IMPORT hanya untuk DATA MCU',
    '  • File PDF/JPG upload MANUAL per karyawan di halaman Monitoring MCU',
    '',
    '❓ TROUBLESHOOTING:',
    '  • Kalau NRP error → cek pastikan tidak ada spasi tambahan',
    '  • Kalau tanggal error → pakai format YYYY-MM-DD',
    '  • Kalau hasil error → pastikan pakai teks EXACT (case sensitive)',
    '',
    '✅ SETELAH SELESAI:',
    '  1. Save file Excel',
    '  2. Upload ke halaman Import MCU',
    '  3. Preview hasil → cek error kalau ada',
    '  4. Klik "COMMIT IMPORT" untuk simpan ke database',
  ]
  guides.forEach((line, idx) => {
    const cell = ws2.getCell(idx + 1, 1)
    cell.value = line
    if (line.startsWith('📘')) {
      cell.font = { bold: true, size: 14, color: { argb: 'FF003D79' } }
    } else if (line.startsWith('⚠️') || line.startsWith('📅') || line.startsWith('📋') ||
               line.startsWith('🏥') || line.startsWith('🔬') || line.startsWith('💚') ||
               line.startsWith('📤') || line.startsWith('❓') || line.startsWith('✅')) {
      cell.font = { bold: true, size: 11, color: { argb: 'FFF59E0B' } }
    }
  })

  // ── Generate buffer ──
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