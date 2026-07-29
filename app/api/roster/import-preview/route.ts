// app/api/roster/import-preview/route.ts
// Parse Excel roster → return preview data (belum insert ke DB)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import ExcelJS from 'exceljs'

const VALID_SHIFTS = ['S','M','OFF','CR','CT','LV','ID','TR','SCK','MCK','I','IR','A']

const NRP_HEADERS = ['nrp','id ss6','id','no ss6','id ss','no','nomor','nik','id karyawan','no karyawan']
const NAMA_HEADERS = ['nama','nama operator','nama karyawan','name','nama lengkap','nama pekerja']

function normalizeShift(raw: string): string | null {
  if (!raw) return null
  const val = String(raw).trim().toUpperCase()
  if (VALID_SHIFTS.includes(val)) return val
  // Alias umum
  if (val === 'SIANG' || val === 'DS' || val === 'P') return 'S'
  if (val === 'MALAM' || val === 'NS' || val === 'N') return 'M'
  if (val === 'LIBUR' || val === 'DAY OFF' || val === 'DAYOFF' || val === 'O') return 'OFF'
  if (val === 'CUTI' || val === 'CUTI ROSTER') return 'CR'
  if (val === 'CUTI TAHUNAN') return 'CT'
  if (val === 'INDUKSI') return 'ID'
  if (val === 'TRAINING') return 'TR'
  if (val === 'LEAVE') return 'LV'
  if (val === 'SAKIT') return 'S'
  if (val === 'IZIN') return 'I'
  if (val === 'ALFA' || val === 'ALPHA') return 'A'
  if (val === '-' || val === '' || val === '0') return null
  return null // unknown shift
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
    const bulan = formData.get('bulan') as string  // format: "2026-08"
    const site = formData.get('site') as string

    if (!file) return NextResponse.json({ error: 'File wajib diupload' }, { status: 400 })
    if (!bulan) return NextResponse.json({ error: 'Bulan wajib dipilih' }, { status: 400 })

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'File harus Excel (.xlsx atau .xls)' }, { status: 400 })
    }

    // Parse bulan
    const [tahun, bln] = bulan.split('-').map(Number)
    if (!tahun || !bln || bln < 1 || bln > 12) {
      return NextResponse.json({ error: 'Format bulan tidak valid (YYYY-MM)' }, { status: 400 })
    }
    const jmlHari = new Date(tahun, bln, 0).getDate()
    const periodeLabel = new Date(tahun, bln - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()

    // Read Excel
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ error: 'Sheet Excel kosong' }, { status: 400 })
    }

    // ─── Auto-detect header row ───
    let headerRowIndex = -1
    let nrpColIndex = -1
    let namaColIndex = -1
    let dayStartColIndex = -1

    worksheet.eachRow((row, rowNumber) => {
      if (headerRowIndex > 0) return // sudah ketemu

      row.eachCell((cell, colNumber) => {
        const val = String(cell.value || '').trim().toLowerCase()
        if (NRP_HEADERS.includes(val)) {
          headerRowIndex = rowNumber
          nrpColIndex = colNumber
        }
        if (NAMA_HEADERS.includes(val)) {
          namaColIndex = colNumber
        }
      })
    })

    if (headerRowIndex < 0 || nrpColIndex < 0) {
      return NextResponse.json({
        error: 'Kolom NRP tidak ditemukan. Pastikan header berisi salah satu: NRP, ID SS6, ID, No SS6'
      }, { status: 400 })
    }

    // ─── Auto-detect kolom tanggal (1-31) ───
    const headerRow = worksheet.getRow(headerRowIndex)
    const dayColumns: Map<number, number> = new Map() // colIndex → day number

    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').trim()
      const num = parseInt(val)
      if (!isNaN(num) && num >= 1 && num <= 31) {
        dayColumns.set(colNumber, num)
      }
    })

    if (dayColumns.size === 0) {
      // Coba cek baris di bawah header (kadang angka tanggal ada di baris ke-2)
      const subHeaderRow = worksheet.getRow(headerRowIndex + 1)
      if (subHeaderRow) {
        subHeaderRow.eachCell((cell, colNumber) => {
          const val = String(cell.value || '').trim()
          const num = parseInt(val)
          if (!isNaN(num) && num >= 1 && num <= 31) {
            dayColumns.set(colNumber, num)
          }
        })
        if (dayColumns.size > 0) {
          // Tanggal ada di sub-header → data mulai dari headerRowIndex + 2
          headerRowIndex = headerRowIndex + 1
        }
      }
    }

    if (dayColumns.size < 10) {
      return NextResponse.json({
        error: `Kolom tanggal tidak cukup (ditemukan ${dayColumns.size}). Pastikan ada kolom 1, 2, 3, ..., 31`
      }, { status: 400 })
    }

    // ─── Ambil daftar karyawan aktif ───
    let empQuery = supabaseAdmin
      .from('employees')
      .select('nrp, nama, site, status_karyawan, tanggal_resign')

    if (site) {
      empQuery = empQuery.eq('site', site)
    }

    const { data: employees } = await empQuery
    const empMap = new Map((employees || []).map(e => [String(e.nrp).trim(), e]))

    // Buat set NRP tanpa leading zero juga (agar cocok dgn Excel yg kadang drop leading zero)
    const empMapAlt = new Map<string, any>()
    ;(employees || []).forEach(e => {
      const nrpClean = String(e.nrp).trim()
      empMapAlt.set(nrpClean, e)
      if (nrpClean.startsWith('0')) {
        empMapAlt.set(nrpClean.substring(1), e)
      } else {
        empMapAlt.set('0' + nrpClean, e)
      }
    })

    // ─── Parse data rows ───
    const validRows: any[] = []
    const invalidRows: any[] = []
    const parsedEmployees: any[] = []

    const totalRows = worksheet.rowCount
    for (let rowIdx = headerRowIndex + 1; rowIdx <= totalRows; rowIdx++) {
      const row = worksheet.getRow(rowIdx)
      const nrpCell = String(row.getCell(nrpColIndex).value || '').trim()
      const namaCell = namaColIndex > 0 ? String(row.getCell(namaColIndex).value || '').trim() : ''

      if (!nrpCell || nrpCell === '' || nrpCell === 'null' || nrpCell === 'undefined') continue

      // Cari karyawan di DB
      const emp = empMapAlt.get(nrpCell)

      if (!emp) {
        invalidRows.push({
          baris: rowIdx,
          nrp: nrpCell,
          nama: namaCell,
          alasan: `NRP "${nrpCell}" tidak ditemukan di database`
        })
        continue
      }

      if (emp.tanggal_resign) {
        invalidRows.push({
          baris: rowIdx,
          nrp: nrpCell,
          nama: emp.nama,
          alasan: 'Karyawan sudah resign'
        })
        continue
      }

      if (emp.status_karyawan === 'Nonaktif' || emp.status_karyawan === 'Resign') {
        invalidRows.push({
          baris: rowIdx,
          nrp: nrpCell,
          nama: emp.nama,
          alasan: `Status: ${emp.status_karyawan}`
        })
        continue
      }

      // Parse shift per hari
      let hasValidShift = false
      const shifts: any[] = []

      dayColumns.forEach((dayNum, colIdx) => {
        if (dayNum > jmlHari) return // skip tanggal 29/30/31 kalau bulannya lebih pendek

        const cellVal = String(row.getCell(colIdx).value || '').trim()
        const shiftCode = normalizeShift(cellVal)

        if (shiftCode) {
          hasValidShift = true
          const tanggal = `${tahun}-${String(bln).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          shifts.push({
            nrp: emp.nrp,
            tanggal,
            shift_code: shiftCode,
            periode: periodeLabel
          })
        } else if (cellVal && cellVal !== '-' && cellVal !== '0' && cellVal !== '') {
          invalidRows.push({
            baris: rowIdx,
            nrp: emp.nrp,
            nama: emp.nama,
            alasan: `Kode shift "${cellVal}" tidak valid (tanggal ${dayNum})`
          })
        }
      })

      if (hasValidShift) {
        validRows.push(...shifts)
        parsedEmployees.push({
          nrp: emp.nrp,
          nama: emp.nama,
          jabatan: emp.jabatan || '-',
          site: emp.site,
          total_shift: shifts.length
        })
      }
    }

    // ─── Cek existing data (conflict check) ───
    const startDate = `${tahun}-${String(bln).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bln).padStart(2, '0')}-${String(jmlHari).padStart(2, '0')}`

    const existingNrps = [...new Set(validRows.map(r => r.nrp))]
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

    return NextResponse.json({
      ok: true,
      preview: {
        periode: periodeLabel,
        bulan,
        site: site || 'Semua',
        jmlHari,
        totalKaryawan: parsedEmployees.length,
        totalRow: validRows.length,
        existingCount,
        hasConflict: existingCount > 0,
        parsedEmployees: parsedEmployees.slice(0, 20), // Preview max 20
        invalidRows: invalidRows.slice(0, 50),
        totalInvalid: invalidRows.length
      },
      // Data untuk confirm (tidak ditampilkan ke user, cuma dikirim balik)
      _data: validRows
    })

  } catch (err: any) {
    console.error('[import-preview]', err)
    return NextResponse.json({ error: 'Gagal parse Excel: ' + err.message }, { status: 500 })
  }
}