// app/api/roster/download-template/route.ts
// Generate Excel template roster multi-sheet
// Auto-fill karyawan aktif per kategori (by filter_jabatan)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import ExcelJS from 'exceljs'

// Nama hari Indonesia (Excel format)
const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const NAMA_HARI_INDO = ['Mgg', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

// Warna cell untuk shift (format ARGB)
const SHIFT_COLORS: Record<string, string> = {
  'S': 'FFFFFF00',    // Kuning (Siang)
  'M': 'FF4A90E2',    // Biru (Malam)
  'OFF': 'FF000000',  // Hitam
  'CR': 'FFFFA500',   // Oranye (Cuti Roster)
  'CT': 'FFFF69B4',   // Pink (Cuti Tahunan)
  'ID': 'FFC0C0C0',   // Abu (Induksi)
  'TR': 'FFD3D3D3',   // Abu muda (Training)
  'LV': 'FFDDA0DD',   // Ungu muda
  'SCK': 'FFFFCCCC',  // Merah muda
  'MCK': 'FFCC99FF',  // Ungu
  'I': 'FFFFDAB9',    // Peach
  'IR': 'FFFFE4B5',   // Moccasin
  'A': 'FFFF0000'     // Merah (Alfa)
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const bulan = searchParams.get('bulan') || '' // "2026-08"
    const site = searchParams.get('site') || ''
    const withData = searchParams.get('withData') !== 'false' // default true (auto-fill)

    if (!bulan) {
      return NextResponse.json({ error: 'Bulan wajib diisi (?bulan=YYYY-MM)' }, { status: 400 })
    }

    const [tahun, bln] = bulan.split('-').map(Number)
    if (!tahun || !bln || bln < 1 || bln > 12) {
      return NextResponse.json({ error: 'Format bulan tidak valid' }, { status: 400 })
    }

    const jmlHari = new Date(tahun, bln, 0).getDate()
    const namaBulan = new Date(tahun, bln - 1)
      .toLocaleDateString('id-ID', { month: 'long' })
      .toUpperCase()
    const periodeLabel = `PERIODE 01 - ${jmlHari} ${namaBulan} ${tahun}`
    const updateLabel = `Update : ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} Rev.00`

    // ─── Ambil kategori aktif ───
    const { data: categories, error: catErr } = await supabaseAdmin
      .from('roster_sheet_categories')
      .select('*')
      .eq('active', true)
      .order('urutan', { ascending: true })

    if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 })
    if (!categories || categories.length === 0) {
      return NextResponse.json({ error: 'Tidak ada kategori aktif' }, { status: 400 })
    }

    // ─── Ambil karyawan aktif (kalau withData) ───
    let allEmployees: any[] = []
    if (withData) {
      let empQuery = supabaseAdmin
        .from('employees')
        .select('nrp, nama, jabatan, site, departemen')
        .is('tanggal_resign', null)
        .neq('status_karyawan', 'Nonaktif')
        .neq('status_karyawan', 'Resign')

      if (site) empQuery = empQuery.eq('site', site)

      const { data: emps } = await empQuery
      allEmployees = emps || []
    }

    // ─── Ambil roster existing (kalau ada, untuk pre-fill shift) ───
    const startDate = `${tahun}-${String(bln).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bln).padStart(2, '0')}-${String(jmlHari).padStart(2, '0')}`

    let existingRosters: any[] = []
    if (withData) {
      const { data: rosters } = await supabaseAdmin
        .from('rosters')
        .select('nrp, tanggal, shift_code, unit')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
      existingRosters = rosters || []
    }

    // Map roster: nrp -> tanggal -> {shift, unit}
    const rosterMap = new Map<string, Map<number, { shift: string; unit: string | null }>>()
    existingRosters.forEach(r => {
      if (!rosterMap.has(r.nrp)) rosterMap.set(r.nrp, new Map())
      const day = new Date(r.tanggal).getDate()
      rosterMap.get(r.nrp)!.set(day, { shift: r.shift_code, unit: r.unit })
    })

    // ─── Generate Excel ───
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BTM Portal'
    workbook.created = new Date()

    for (const cat of categories) {
      const ws = workbook.addWorksheet(cat.nama_sheet, {
        views: [{ state: 'frozen', xSplit: 6, ySplit: 8 }]
      })

      // ─── ROW 1: Judul ───
      ws.mergeCells(1, 1, 1, 6 + jmlHari)
      const titleCell = ws.getCell(1, 1)
      titleCell.value = cat.judul_header
      titleCell.font = { bold: true, size: 14 }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

      // ─── ROW 2: Periode ───
      ws.mergeCells(2, 1, 2, 6 + jmlHari)
      const periodeCell = ws.getCell(2, 1)
      periodeCell.value = periodeLabel
      periodeCell.font = { bold: true, size: 11 }
      periodeCell.alignment = { horizontal: 'center' }

      // ─── ROW 3: Update ───
      ws.mergeCells(3, 1, 3, 6 + jmlHari)
      const updateCell = ws.getCell(3, 1)
      updateCell.value = updateLabel
      updateCell.font = { italic: true, size: 9 }
      updateCell.alignment = { horizontal: 'center' }

      // ─── ROW 5: Header hari (Sab, Mgg, Sen, ...) ───
      const dayHeaderRow = 5
      ws.getCell(dayHeaderRow, 1).value = 'NO'
      ws.getCell(dayHeaderRow, 2).value = 'ID SS6'
      ws.getCell(dayHeaderRow, 3).value = 'NAMA OPERATOR'

      if (cat.tipe === 'operator') {
        ws.getCell(dayHeaderRow, 4).value = 'UNIT'
        ws.getCell(dayHeaderRow, 5).value = 'DAY OFF'
      } else {
        ws.getCell(dayHeaderRow, 4).value = 'JABATAN'
        ws.getCell(dayHeaderRow, 5).value = 'SIMPER'
      }

      // Nama hari (baris 5) - Sab/Mgg/Sen/... berdasarkan tanggal
      for (let d = 1; d <= jmlHari; d++) {
        const date = new Date(tahun, bln - 1, d)
        const dayIdx = date.getDay() // 0=Min, 1=Sen, ..., 6=Sab
        ws.getCell(dayHeaderRow, 5 + d).value = NAMA_HARI_INDO[dayIdx]
        ws.getCell(dayHeaderRow, 5 + d).alignment = { horizontal: 'center' }
        ws.getCell(dayHeaderRow, 5 + d).font = { bold: true, size: 9 }
      }

      // ─── ROW 6: Angka tanggal (01, 02, ..., 31) ───
      const dateHeaderRow = 6
      ws.getCell(dateHeaderRow, 1).value = ''
      ws.getCell(dateHeaderRow, 2).value = ''
      ws.getCell(dateHeaderRow, 3).value = ''
      ws.getCell(dateHeaderRow, 4).value = ''
      ws.getCell(dateHeaderRow, 5).value = ''

      for (let d = 1; d <= jmlHari; d++) {
        const cell = ws.getCell(dateHeaderRow, 5 + d)
        cell.value = d
        cell.alignment = { horizontal: 'center' }
        cell.font = { bold: true, size: 10 }
        cell.numFmt = '00'
      }

      // Style header row
      const headerRow = ws.getRow(dayHeaderRow)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D79' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      })

      // ─── ROW 8+: Data karyawan (auto-fill by filter_jabatan) ───
      let currentRow = 8

      if (withData && cat.filter_jabatan && cat.filter_jabatan.length > 0) {
        // Filter karyawan yang jabatannya match
        const filterSet = new Set(cat.filter_jabatan.map((j: string) => j.toLowerCase()))
        const matchedEmps = allEmployees.filter(e => 
          filterSet.has((e.jabatan || '').toLowerCase())
        )

        // Sort by nama
        matchedEmps.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''))

        matchedEmps.forEach((emp, idx) => {
          const row = ws.getRow(currentRow)
          row.getCell(1).value = idx + 1
          row.getCell(2).value = emp.nrp
          row.getCell(3).value = emp.nama

          if (cat.tipe === 'operator') {
            // Cari unit dari roster existing (kalau ada)
            const empRoster = rosterMap.get(emp.nrp)
            let unitFromRoster: string | null = null
            if (empRoster) {
              for (const [_, v] of empRoster) {
                if (v.unit) { unitFromRoster = v.unit; break }
              }
            }
            row.getCell(4).value = unitFromRoster || 'SPARE'
            row.getCell(5).value = ''
          } else {
            row.getCell(4).value = emp.jabatan || '-'
            row.getCell(5).value = 'LV'
          }

          // Fill shift dari roster existing
          const empRoster = rosterMap.get(emp.nrp)
          for (let d = 1; d <= jmlHari; d++) {
            const cell = row.getCell(5 + d)
            const shiftData = empRoster?.get(d)
            
            if (shiftData) {
              cell.value = shiftData.shift
              cell.alignment = { horizontal: 'center' }
              cell.font = { bold: true, size: 10 }
              
              const color = SHIFT_COLORS[shiftData.shift]
              if (color) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: color }
                }
                // Text putih kalau bg gelap
                if (['M', 'OFF', 'A'].includes(shiftData.shift)) {
                  cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
                }
              }
            }

            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            }
          }

          // Border kolom info
          for (let c = 1; c <= 5; c++) {
            row.getCell(c).border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            }
          }

          currentRow++
        })
      }

      // Kalau tidak ada data / template kosong → tambah 20 baris kosong dengan border
      if (!withData || currentRow === 8) {
        for (let i = 0; i < 20; i++) {
          const row = ws.getRow(currentRow)
          for (let c = 1; c <= 5 + jmlHari; c++) {
            row.getCell(c).border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            }
          }
          currentRow++
        }
      }

      // ─── Set column widths ───
      ws.getColumn(1).width = 5   // NO
      ws.getColumn(2).width = 10  // ID SS6
      ws.getColumn(3).width = 30  // NAMA
      ws.getColumn(4).width = 15  // UNIT/JABATAN
      ws.getColumn(5).width = 10  // DAY OFF/SIMPER
      for (let d = 1; d <= jmlHari; d++) {
        ws.getColumn(5 + d).width = 5
      }

      // Row heights
      ws.getRow(1).height = 22
      ws.getRow(2).height = 18
      ws.getRow(3).height = 14
      ws.getRow(5).height = 20
      ws.getRow(6).height = 20
    }

    // ─── Tambah sheet LEGENDA di paling akhir ───
    const legendaWs = workbook.addWorksheet('LEGENDA', {
      properties: { tabColor: { argb: 'FF00A86B' } }
    })
    legendaWs.getCell(1, 1).value = 'LEGENDA KODE SHIFT'
    legendaWs.getCell(1, 1).font = { bold: true, size: 14 }
    legendaWs.mergeCells(1, 1, 1, 3)

    const legendaData = [
      ['Kode', 'Arti', 'Warna'],
      ['S', 'Siang (Day Shift)', 'Kuning'],
      ['M', 'Malam (Night Shift)', 'Biru'],
      ['OFF', 'Libur / Day Off', 'Hitam'],
      ['CR', 'Cuti Roster', 'Oranye'],
      ['CT', 'Cuti Tahunan', 'Pink'],
      ['SCK', 'Shift Cuti Kompensasi', 'Merah muda'],
      ['MCK', 'Malam Cuti Kompensasi', 'Ungu'],
      ['ID', 'Induksi', 'Abu'],
      ['TR', 'Training', 'Abu muda'],
      ['LV', 'Leave (Special)', 'Ungu muda'],
      ['I', 'Izin Potongan', 'Peach'],
      ['IR', 'Izin Resmi', 'Moccasin'],
      ['A', 'Alfa (Mangkir)', 'Merah']
    ]

    legendaData.forEach((row, idx) => {
      const rowNum = idx + 3
      row.forEach((val, colIdx) => {
        const cell = legendaWs.getCell(rowNum, colIdx + 1)
        cell.value = val
        if (idx === 0) {
          cell.font = { bold: true }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D79' } }
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        }
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      })
      
      // Color preview cell untuk baris data
      if (idx > 0) {
        const kode = row[0]
        const color = SHIFT_COLORS[kode]
        if (color) {
          const preview = legendaWs.getCell(rowNum, 4)
          preview.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
          preview.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        }
      }
    })

    legendaWs.getColumn(1).width = 10
    legendaWs.getColumn(2).width = 30
    legendaWs.getColumn(3).width = 20
    legendaWs.getColumn(4).width = 8

    // ─── Generate buffer & response ───
    const buffer = await workbook.xlsx.writeBuffer()
    
    const fileName = withData
      ? `Roster_${site || 'ALL'}_${namaBulan}_${tahun}.xlsx`
      : `Template_Roster_${namaBulan}_${tahun}.xlsx`

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.byteLength)
      }
    })

  } catch (err: any) {
    console.error('[roster/download-template]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}