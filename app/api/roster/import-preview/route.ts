// app/api/roster/import-preview/route.ts
// Parse Excel roster MULTI-SHEET → return preview data
// Support: Excavator, Bulldozer, Grader, Staff, Plant
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import ExcelJS from 'exceljs'

const VALID_SHIFTS = ['S','M','OFF','CR','CT','LV','ID','TR','SCK','MCK','I','IR','A']

const NRP_HEADERS = ['id ss6','no ss6','id ss','id karyawan','no karyawan','nrp','nik','id']
const NAMA_HEADERS = ['nama','nama operator','nama karyawan','name','nama lengkap','nama pekerja']
const UNIT_HEADERS = ['unit','no unit','kode unit']
const JABATAN_HEADERS = ['jabatan','posisi','position','role']

/**
 * Normalize shift code sesuai LEGENDA ABSENSI:
 * S=Siang, M=Malam, OFF=Libur, CR=Cuti Roster, CT=Cuti Tahunan,
 * SCK=Shift Cuti Kompensasi, MCK=Malam Cuti Kompensasi,
 * ID=Induksi, TR=Training, LV=Leave, I=Izin Potongan, IR=Izin Resmi, A=Alfa
 */
function normalizeShift(raw: any): string | null {
  if (raw === null || raw === undefined) return null
  const val = String(raw).trim().toUpperCase()
  if (val === '' || val === '-' || val === '0' || val === 'NULL' || val === 'NA') return null

  if (VALID_SHIFTS.includes(val)) return val

  // Alias
  if (val === 'SIANG' || val === 'DS' || val === 'DAY' || val === 'DAY SHIFT' || val === 'P') return 'S'
  if (val === 'MALAM' || val === 'NS' || val === 'NIGHT' || val === 'NIGHT SHIFT' || val === 'N') return 'M'
  if (val === 'LIBUR' || val === 'DAY OFF' || val === 'DAYOFF' || val === 'OFF DUTY' || val === 'O') return 'OFF'
  if (val === 'CUTI' || val === 'CUTI ROSTER' || val === 'CR ROSTER') return 'CR'
  if (val === 'CUTI TAHUNAN' || val === 'CT ANNUAL' || val === 'ANNUAL LEAVE') return 'CT'
  if (val === 'SHIFT CUTI KOMPENSASI' || val === 'SIANG KOMPENSASI') return 'SCK'
  if (val === 'MALAM CUTI KOMPENSASI' || val === 'MALAM KOMPENSASI') return 'MCK'
  if (val === 'INDUKSI' || val === 'INDUCTION') return 'ID'
  if (val === 'TRAINING' || val === 'TRAIN' || val === 'DIKLAT') return 'TR'
  if (val === 'LEAVE' || val === 'SPECIAL LEAVE') return 'LV'
  if (val === 'IZIN' || val === 'IZIN POTONGAN' || val === 'IJIN') return 'I'
  if (val === 'IZIN RESMI' || val === 'IJIN RESMI' || val === 'PERMIT') return 'IR'
  if (val === 'ALFA' || val === 'ALPHA' || val === 'ABSEN' || val === 'MANGKIR') return 'A'

  return null
}

/**
 * Normalize unit code (E201, D8502, GD701, SPARE, dll)
 * Buang spasi, uppercase, standardize
 */
function normalizeUnit(raw: any): string | null {
  if (raw === null || raw === undefined) return null
  const val = String(raw).trim().toUpperCase().replace(/\s+/g, ' ')
  if (val === '' || val === '-' || val === '0' || val === 'NULL') return null
  return val
}

/**
 * Cek apakah row adalah baris ringkasan (bukan data karyawan)
 * 
 * FIX: Sebelumnya keyword "HELPER PLANT", "WELDER", "DRIVER LV", "STAFF"
 * bikin row karyawan dengan jabatan tsb ke-skip → data hilang!
 * 
 * Strategi baru:
 * 1. Kalau ada NRP (angka 4+ digit) di kolom awal, PASTI row karyawan → BUKAN summary
 * 2. Kalau tidak ada NRP, baru cek keyword ringkasan di kolom awal saja
 */
function isSummaryRow(rowValues: any[]): boolean {
  // Ambil 6 kolom pertama saja (label ringkasan biasanya di sini)
  const firstCells = rowValues.slice(0, 6)
    .map(v => String(v || '').trim().toUpperCase())

  // Kalau ada NRP (angka 4+ digit) → pasti row karyawan, BUKAN summary
  const hasNRP = firstCells.some(v => /^\d{4,}$/.test(v))
  if (hasNRP) return false

  // Kalau tidak ada NRP, cek keyword summary di kolom awal
  const text = firstCells.join(' ')
  const keywords = [
    'RINGKASAN', 'OFF/CUTI', 'OFF / CUTI',
    'SHIFT SIANG', 'SHIFT MALAM', 'DEPT.',
    'DAY SHIFT', 'NIGHT SHIFT',
    'TOTAL', 'JUMLAH', 'SUB TOTAL', 'SUBTOTAL', 'GRAND TOTAL'
  ]
  return keywords.some(k => text.includes(k))
}

/**
 * Detect struktur sheet - cari header row & kolom penting
 */
function detectSheetStructure(worksheet: ExcelJS.Worksheet) {
  let headerRowIndex = -1
  let nrpColIndex = -1
  let namaColIndex = -1
  let unitColIndex = -1
  let jabatanColIndex = -1

  // Loop max 15 baris pertama (header biasanya di baris 1-10)
  const maxRow = Math.min(worksheet.rowCount, 15)

  for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
    const row = worksheet.getRow(rowNum)
    let foundNrpInThisRow = false

    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const val = String(cell.value || '').trim().toLowerCase()

      if (NRP_HEADERS.includes(val) && !foundNrpInThisRow) {
        headerRowIndex = rowNum
        nrpColIndex = colNum
        foundNrpInThisRow = true
      }
      if (headerRowIndex === rowNum) {
        if (NAMA_HEADERS.includes(val)) namaColIndex = colNum
        if (UNIT_HEADERS.includes(val)) unitColIndex = colNum
        if (JABATAN_HEADERS.includes(val)) jabatanColIndex = colNum
      }
    })

    if (headerRowIndex > 0) break
  }

  // Deteksi kolom tanggal (1-31)
  const dayColumns = new Map<number, number>()
  if (headerRowIndex > 0) {
    const headerRow = worksheet.getRow(headerRowIndex)
    headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const raw = cell.value
      const num = typeof raw === 'number' ? raw : parseInt(String(raw).trim())
      if (!isNaN(num) && num >= 1 && num <= 31) {
        dayColumns.set(colNum, num)
      }
    })

    // Kalau angka tanggal ada di baris SETELAH header NRP (sub-header)
    if (dayColumns.size < 10) {
      const subHeaderRow = worksheet.getRow(headerRowIndex + 1)
      subHeaderRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
        const raw = cell.value
        const num = typeof raw === 'number' ? raw : parseInt(String(raw).trim())
        if (!isNaN(num) && num >= 1 && num <= 31) {
          dayColumns.set(colNum, num)
        }
      })
      if (dayColumns.size >= 10) {
        // Sub-header terdeteksi → data mulai dari headerRowIndex + 2
        headerRowIndex = headerRowIndex + 1
      }
    }
  }

  return {
    headerRowIndex,
    nrpColIndex,
    namaColIndex,
    unitColIndex,
    jabatanColIndex,
    dayColumns,
    hasUnit: unitColIndex > 0
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const isSuperAdmin = userRoles.includes('super_admin')
  const canUpload = isSuperAdmin || userRoles.some(r =>
    ['hr_ho','hr_site','pjo_site'].includes(r)
  )

  if (!canUpload) {
    return NextResponse.json({ error: 'Tidak punya akses upload roster' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bulan = formData.get('bulan') as string  // "2026-08"
    const site = formData.get('site') as string    // "PPA-MLP"

    if (!file) return NextResponse.json({ error: 'File wajib diupload' }, { status: 400 })
    if (!bulan) return NextResponse.json({ error: 'Bulan wajib dipilih' }, { status: 400 })

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      return NextResponse.json({ error: 'File harus Excel (.xlsx atau .xls)' }, { status: 400 })
    }

    // Parse bulan
    const [tahun, bln] = bulan.split('-').map(Number)
    if (!tahun || !bln || bln < 1 || bln > 12) {
      return NextResponse.json({ error: 'Format bulan tidak valid (YYYY-MM)' }, { status: 400 })
    }
    const jmlHari = new Date(tahun, bln, 0).getDate()
    const periodeLabel = new Date(tahun, bln - 1)
      .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      .toUpperCase()

    // Read Excel
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer as any)

    if (workbook.worksheets.length === 0) {
      return NextResponse.json({ error: 'File Excel tidak punya sheet' }, { status: 400 })
    }

    // ─── Ambil daftar karyawan aktif ───
    let empQuery = supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, site, status_karyawan, tanggal_resign')

    if (site) {
      empQuery = empQuery.eq('site', site)
    }

    const { data: employees, error: empErr } = await empQuery

    if (empErr) {
      return NextResponse.json({ error: 'Gagal ambil data karyawan: ' + empErr.message }, { status: 500 })
    }

    // Buat map dengan support leading zero
    const empMap = new Map<string, any>()
    ;(employees || []).forEach(e => {
      const nrpClean = String(e.nrp).trim()
      empMap.set(nrpClean, e)
      if (nrpClean.startsWith('0')) {
        empMap.set(nrpClean.substring(1), e)
      } else {
        empMap.set('0' + nrpClean, e)
      }
    })

    // ─── Loop SEMUA SHEET ───
    const allValidRows: any[] = []
    const allInvalidRows: any[] = []
    const parsedEmployeesMap = new Map<string, any>() // dedupe by nrp
    const sheetSummaries: any[] = []
    const uniqueUnits = new Set<string>()

    for (let sheetIdx = 0; sheetIdx < workbook.worksheets.length; sheetIdx++) {
      const worksheet = workbook.worksheets[sheetIdx]
      const sheetName = worksheet.name || `Sheet${sheetIdx + 1}`

      const structure = detectSheetStructure(worksheet)

      // Skip sheet yang tidak bisa dideteksi
      if (structure.headerRowIndex < 0 || structure.nrpColIndex < 0) {
        sheetSummaries.push({
          sheetName,
          status: 'skipped',
          reason: 'Header NRP tidak ditemukan',
          totalKaryawan: 0,
          totalShift: 0
        })
        continue
      }

      if (structure.dayColumns.size < 10) {
        sheetSummaries.push({
          sheetName,
          status: 'skipped',
          reason: `Kolom tanggal tidak cukup (hanya ${structure.dayColumns.size})`,
          totalKaryawan: 0,
          totalShift: 0
        })
        continue
      }

      // Parse data rows
      const sheetValidRows: any[] = []
      const sheetInvalidRows: any[] = []
      const sheetEmployees = new Set<string>()

      for (let rowIdx = structure.headerRowIndex + 1; rowIdx <= worksheet.rowCount; rowIdx++) {
        const row = worksheet.getRow(rowIdx)

        // Ambil semua nilai di row untuk cek summary
        const rowValues: any[] = []
        row.eachCell({ includeEmpty: true }, (cell) => {
          rowValues.push(cell.value)
        })

        // Skip baris ringkasan
        if (isSummaryRow(rowValues)) continue

        const nrpRaw = row.getCell(structure.nrpColIndex).value
        const nrpCell = String(nrpRaw || '').trim()

        // Skip baris kosong
        if (!nrpCell || nrpCell === 'null' || nrpCell === 'undefined') continue

        // Skip kalau NRP bukan angka (kemungkinan text/header lain)
        if (!/^\d+$/.test(nrpCell)) continue

        const namaCell = structure.namaColIndex > 0
          ? String(row.getCell(structure.namaColIndex).value || '').trim()
          : ''

        // Cari karyawan di DB
        const emp = empMap.get(nrpCell)

        if (!emp) {
          sheetInvalidRows.push({
            sheet: sheetName,
            baris: rowIdx,
            nrp: nrpCell,
            nama: namaCell,
            alasan: `NRP tidak ditemukan di database`
          })
          continue
        }

        if (emp.tanggal_resign) {
          sheetInvalidRows.push({
            sheet: sheetName,
            baris: rowIdx,
            nrp: nrpCell,
            nama: emp.nama,
            alasan: 'Karyawan sudah resign'
          })
          continue
        }

        if (emp.status_karyawan === 'Nonaktif' || emp.status_karyawan === 'Resign') {
          sheetInvalidRows.push({
            sheet: sheetName,
            baris: rowIdx,
            nrp: nrpCell,
            nama: emp.nama,
            alasan: `Status: ${emp.status_karyawan}`
          })
          continue
        }

        // Ambil UNIT (kalau ada kolomnya)
        let unitVal: string | null = null
        if (structure.unitColIndex > 0) {
          const rawUnit = row.getCell(structure.unitColIndex).value
          unitVal = normalizeUnit(rawUnit)
        }

        // Parse shift per hari
        let hasValidShift = false
        const shifts: any[] = []

        structure.dayColumns.forEach((dayNum, colIdx) => {
          if (dayNum > jmlHari) return // skip tanggal 31 kalau bulan 30 hari

          const cellVal = row.getCell(colIdx).value
          const shiftCode = normalizeShift(cellVal)

          if (shiftCode) {
            hasValidShift = true
            const tanggal = `${tahun}-${String(bln).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            shifts.push({
              nrp: emp.nrp,
              tanggal,
              shift_code: shiftCode,
              periode: periodeLabel,
              unit: unitVal
            })
          } else if (cellVal !== null && cellVal !== undefined) {
            const rawStr = String(cellVal).trim()
            if (rawStr && rawStr !== '-' && rawStr !== '0') {
              sheetInvalidRows.push({
                sheet: sheetName,
                baris: rowIdx,
                nrp: emp.nrp,
                nama: emp.nama,
                alasan: `Kode shift "${rawStr}" tidak valid (tanggal ${dayNum})`
              })
            }
          }
        })

        if (hasValidShift) {
          sheetValidRows.push(...shifts)
          sheetEmployees.add(emp.nrp)

          // Simpan info karyawan (dedupe)
          if (!parsedEmployeesMap.has(emp.nrp)) {
            parsedEmployeesMap.set(emp.nrp, {
              nrp: emp.nrp,
              nama: emp.nama,
              jabatan: emp.jabatan || '-',
              site: emp.site,
              unit: unitVal,
              sheet: sheetName,
              total_shift: shifts.length
            })
          } else {
            // Kalau NRP muncul di 2 sheet, akumulasi total shift
            const existing = parsedEmployeesMap.get(emp.nrp)
            existing.total_shift += shifts.length
          }

          if (unitVal) uniqueUnits.add(unitVal)
        }
      }

      allValidRows.push(...sheetValidRows)
      allInvalidRows.push(...sheetInvalidRows)

      sheetSummaries.push({
        sheetName,
        status: 'success',
        totalKaryawan: sheetEmployees.size,
        totalShift: sheetValidRows.length,
        hasUnit: structure.hasUnit,
        totalInvalid: sheetInvalidRows.length
      })
    }

    // ─── Cek existing data (conflict check) ───
    const startDate = `${tahun}-${String(bln).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bln).padStart(2, '0')}-${String(jmlHari).padStart(2, '0')}`

    const existingNrps = [...new Set(allValidRows.map(r => r.nrp))]
    let existingCount = 0

    if (existingNrps.length > 0) {
      const { count } = await supabaseAdmin
        .from('rosters')
        .select('nrp', { count: 'exact', head: true })
        .in('nrp', existingNrps)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)

      existingCount = count || 0
    }

    const parsedEmployeesList = Array.from(parsedEmployeesMap.values())

    return NextResponse.json({
      ok: true,
      preview: {
        periode: periodeLabel,
        bulan,
        tahun,
        bulanNumber: bln,
        site: site || 'Semua',
        jmlHari,
        totalSheet: workbook.worksheets.length,
        sheetSummaries,
        totalKaryawan: parsedEmployeesList.length,
        totalRow: allValidRows.length,
        totalUnit: uniqueUnits.size,
        uniqueUnits: Array.from(uniqueUnits).sort(),
        existingCount,
        hasConflict: existingCount > 0,
        parsedEmployees: parsedEmployeesList.slice(0, 30),
        invalidRows: allInvalidRows.slice(0, 50),
        totalInvalid: allInvalidRows.length
      },
      _data: allValidRows
    })

  } catch (err: any) {
    console.error('[import-preview]', err)
    return NextResponse.json({ error: 'Gagal parse Excel: ' + (err.message || 'Unknown error') }, { status: 500 })
  }
}